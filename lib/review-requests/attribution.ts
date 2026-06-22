import "server-only";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  reviewRequestRecipients,
  reviewRequestEvents,
} from "@/lib/db/schema";

/**
 * When a new review is detected, try to match it to a recent review-request
 * recipient. If a match is found, update the recipient status to "reviewed"
 * and log an attribution event.
 *
 * Matching is fuzzy: we normalize names to lowercase and compare the first
 * word (common first-name match). This catches "John" matching "John S."
 * or "john smith". Not perfect, but good enough for SMB-scale where the
 * owner knows their customers.
 */
export async function tryAttributeReview(args: {
  orgId: string;
  reviewId: string;
  reviewerName: string | null;
}): Promise<{ matched: boolean; recipientId: string | null }> {
  if (!args.reviewerName) return { matched: false, recipientId: null };

  const normalizedFirst = normalizeName(args.reviewerName);
  if (!normalizedFirst) return { matched: false, recipientId: null };

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const candidates = await db
    .select({
      id: reviewRequestRecipients.id,
      campaignId: reviewRequestRecipients.campaignId,
      customerName: reviewRequestRecipients.customerName,
      status: reviewRequestRecipients.status,
    })
    .from(reviewRequestRecipients)
    .where(
      and(
        eq(reviewRequestRecipients.orgId, args.orgId),
        gte(reviewRequestRecipients.createdAt, thirtyDaysAgo),
        isNotNull(reviewRequestRecipients.sentAt),
      ),
    )
    .limit(200);

  const match = candidates.find((c) => {
    const candidateFirst = normalizeName(c.customerName);
    return candidateFirst === normalizedFirst;
  });

  if (!match) return { matched: false, recipientId: null };

  await db
    .update(reviewRequestRecipients)
    .set({
      status: "reviewed",
      reviewedAt: new Date(),
    })
    .where(eq(reviewRequestRecipients.id, match.id));

  await db.insert(reviewRequestEvents).values({
    orgId: args.orgId,
    campaignId: match.campaignId,
    recipientId: match.id,
    eventName: "request.reviewed",
    payload: {
      review_id: args.reviewId,
      reviewer_name: args.reviewerName,
      matched_customer: match.customerName,
      match_method: "first_name",
    },
  });

  return { matched: true, recipientId: match.id };
}

function normalizeName(name: string): string | null {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim();
  const first = cleaned.split(/\s+/)[0];
  return first && first.length >= 2 ? first : null;
}
