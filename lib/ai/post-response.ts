import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  locations,
  reviewResponses,
  reviews,
} from "@/lib/db/schema";
import {
  postReviewReplyRaw,
  GbpApiError,
} from "@/lib/integrations/google";
import {
  getValidGoogleAccessToken,
  GoogleNotConnectedError,
  GoogleRefreshError,
} from "@/lib/integrations/google-tokens";
import { gbpPostLimiter } from "@/lib/ratelimit";
import { writeAudit } from "@/lib/audit";

export class NotApprovedError extends Error {
  constructor() {
    super("No response has been saved or approved for this review.");
    this.name = "NotApprovedError";
  }
}

export class UnsupportedSourceError extends Error {
  constructor(source: string) {
    super(`Posting is only supported for Google reviews (got ${source}).`);
    this.name = "UnsupportedSourceError";
  }
}

export class PostingRateLimitedError extends Error {
  constructor() {
    super("Posting rate limit hit for this location. Wait a minute and retry.");
    this.name = "PostingRateLimitedError";
  }
}

export type PostResult = {
  responseId: string;
  reviewId: string;
  postedAt: Date;
  sourceResponseId: string | null;
};

/**
 * Post the active response for a review to Google.
 *
 * - Requires source=google.
 * - Requires an existing review_responses row (any status). Promotes it to
 *   approved → posted in one shot.
 * - GBP_LIVE=false: simulates success without touching Google.
 * - GBP_LIVE=true: calls postReviewReplyRaw with the org's valid access
 *   token (refreshing if needed). Maps Google errors to typed errors.
 */
export async function postResponseToGoogle(args: {
  orgId: string;
  userId: string;
  reviewId: string;
}): Promise<PostResult> {
  const row = await db
    .select({ review: reviews, location: locations })
    .from(reviews)
    .innerJoin(locations, eq(locations.id, reviews.locationId))
    .where(
      and(
        eq(reviews.id, args.reviewId),
        eq(reviews.orgId, args.orgId),
      ),
    )
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!row) throw new Error("Review not found in this organization");
  if (row.review.source !== "google") {
    throw new UnsupportedSourceError(row.review.source);
  }

  const response = await db
    .select()
    .from(reviewResponses)
    .where(
      and(
        eq(reviewResponses.reviewId, args.reviewId),
        eq(reviewResponses.orgId, args.orgId),
      ),
    )
    .orderBy(desc(reviewResponses.updatedAt))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!response || !response.body.trim()) throw new NotApprovedError();

  // Per-location rate limit (matches the Google posting cap configured in
  // lib/ratelimit.ts).
  try {
    const rl = await gbpPostLimiter.limit(row.location.id);
    if (!rl.success) throw new PostingRateLimitedError();
  } catch (err) {
    if (err instanceof PostingRateLimitedError) throw err;
    // If Upstash is unavailable, fail open in dev only.
    if (process.env.NODE_ENV === "production") {
      throw new Error("Rate limiter unavailable.");
    }
  }

  let sourceResponseId: string | null = null;
  let postedAt = new Date();

  try {
    if (process.env.GBP_LIVE === "true") {
      const accessToken = await getValidGoogleAccessToken(args.orgId);
      if (!row.location.gbpAccountId) {
        throw new Error("Location is missing GBP account id");
      }
      // The location's sourceLocationId already starts with "locations/…".
      const result = await postReviewReplyRaw(
        { accessToken },
        row.location.gbpAccountId,
        row.location.sourceLocationId,
        extractReviewIdFromSourceId(
          row.review.sourceReviewId,
          row.location.sourceLocationId,
        ),
        response.body,
      );
      sourceResponseId = "google:reply"; // GBP doesn't return a reply id; flag as posted
      postedAt = new Date(result.updateTime);
    } else {
      // Fixture mode: simulate success.
      sourceResponseId = `fixture-${Date.now()}`;
    }
  } catch (err) {
    await markResponseFailed({
      orgId: args.orgId,
      userId: args.userId,
      response,
      reviewId: args.reviewId,
      err,
    });
    throw err;
  }

  const updated = await db
    .update(reviewResponses)
    .set({
      status: "posted",
      body: response.body, // ensure the posted text matches what we send
      postedAt,
      postedByUserId: args.userId,
      sourceResponseId,
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(reviewResponses.id, response.id))
    .returning();

  await db
    .update(reviews)
    .set({ status: "posted", updatedAt: new Date() })
    .where(eq(reviews.id, args.reviewId));

  await writeAudit({
    orgId: args.orgId,
    actorUserId: args.userId,
    action: "response.posted",
    targetType: "review",
    targetId: args.reviewId,
    metadata: {
      response_id: response.id,
      source: "google",
      fixture: process.env.GBP_LIVE !== "true",
      length: response.body.length,
    },
  });

  const out = updated[0];
  if (!out) throw new Error("Failed to persist posted response");
  return {
    responseId: out.id,
    reviewId: args.reviewId,
    postedAt: out.postedAt ?? postedAt,
    sourceResponseId: out.sourceResponseId,
  };
}

async function markResponseFailed(args: {
  orgId: string;
  userId: string;
  response: { id: string };
  reviewId: string;
  err: unknown;
}): Promise<void> {
  const message = mapErrorMessage(args.err);
  await db
    .update(reviewResponses)
    .set({
      status: "failed",
      errorMessage: message.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(eq(reviewResponses.id, args.response.id));
  await db
    .update(reviews)
    .set({ status: "flagged", updatedAt: new Date() })
    .where(eq(reviews.id, args.reviewId));
  await writeAudit({
    orgId: args.orgId,
    actorUserId: args.userId,
    action: "response.failed",
    targetType: "review",
    targetId: args.reviewId,
    metadata: {
      response_id: args.response.id,
      error: message.slice(0, 200),
      kind: errorKind(args.err),
    },
  });
}

function errorKind(err: unknown): string {
  if (err instanceof GoogleNotConnectedError) return "not_connected";
  if (err instanceof GoogleRefreshError) return "refresh_failed";
  if (err instanceof PostingRateLimitedError) return "rate_limited";
  if (err instanceof GbpApiError) {
    if (err.status === 404) return "review_removed";
    if (err.status === 429) return "google_rate_limited";
    if (err.status === 401 || err.status === 403) return "unauthorized";
    return "google_api_error";
  }
  return "unknown";
}

function mapErrorMessage(err: unknown): string {
  if (err instanceof GoogleNotConnectedError) {
    return "Google is not connected — reconnect to post replies.";
  }
  if (err instanceof GoogleRefreshError) {
    return "Google session expired. Reconnect to refresh access.";
  }
  if (err instanceof PostingRateLimitedError) {
    return err.message;
  }
  if (err instanceof GbpApiError) {
    if (err.status === 404) {
      return "Review no longer exists on Google.";
    }
    if (err.status === 429) {
      return "Google rate-limited the reply. Try again in a minute.";
    }
    if (err.status === 401 || err.status === 403) {
      return "Google rejected the request (token may be revoked).";
    }
    return `Google API error (${err.status}).`;
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * Our sourceReviewId is stored as `${locationName}/reviews/${reviewId}` by
 * pullGoogleReviews. The GBP reply endpoint wants just the trailing review id.
 */
function extractReviewIdFromSourceId(
  sourceReviewId: string,
  sourceLocationId: string,
): string {
  const prefix = `${sourceLocationId}/reviews/`;
  if (sourceReviewId.startsWith(prefix)) {
    return sourceReviewId.slice(prefix.length);
  }
  return sourceReviewId;
}
