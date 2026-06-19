/**
 * Google Business Profile client.
 *
 * Operates in two modes based on GBP_LIVE env flag:
 *   - "false": returns realistic fixture data so dev/demo works while Google
 *              reviews the business.manage scope on the production OAuth
 *              client. The OAuth round-trip is also skipped — see
 *              app/api/integrations/google/connect.
 *   - "true":  hits the live GBP REST APIs.
 *
 * Org-scoped helpers (listGoogleBusinessAccounts, ..., pullGoogleReviews,
 * postGoogleReviewReply) handle token lookup, refresh, retries, normalization,
 * and DB persistence. Low-level OAuth helpers stay exported for the
 * connect/callback routes.
 */

import "server-only";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  locations as locationsTable,
  reviews as reviewsTable,
  type Location,
  type NewReview,
} from "@/lib/db/schema";
import { writeAudit } from "@/lib/audit";
import { HttpError, isRetryableHttpError, withRetry } from "./_retry";
import {
  getValidGoogleAccessToken,
  GoogleNotConnectedError,
} from "./google-tokens";

const LIVE = process.env.GBP_LIVE === "true";

const ACCOUNT_BASE = "https://mybusinessaccountmanagement.googleapis.com/v1";
const BUSINESS_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";
const REVIEWS_BASE = "https://mybusiness.googleapis.com/v4"; // legacy GBP reviews endpoint

export const gbpScopes = ["https://www.googleapis.com/auth/business.manage"];

export type GbpTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
};

export type GbpAccount = {
  name: string;
  accountName: string;
  type: string;
  email?: string;
};

export type GbpLocation = {
  name: string;
  title: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    regionCode?: string;
  };
  primaryPhone?: string;
  websiteUri?: string;
};

export type GbpReview = {
  reviewId: string;
  reviewer: { displayName?: string; profilePhotoUrl?: string };
  starRating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: { comment: string; updateTime: string };
};

const starRatingMap: Record<string, 1 | 2 | 3 | 4 | 5> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

export class GbpApiError extends HttpError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "GbpApiError";
  }
}

/**
 * Thrown when Google accepts the OAuth scope but has not granted this Cloud
 * project quota for the Business Profile APIs yet — surfaced as HTTP 429
 * RESOURCE_EXHAUSTED with quota_limit_value "0". This is a project-approval
 * state, not a transient rate limit, so it is never retried.
 */
export class GbpAccessPendingError extends GbpApiError {
  constructor(message: string) {
    super(429, message);
    this.name = "GbpAccessPendingError";
  }
}

/** Does a 429 body indicate "API access not granted yet" vs a transient limit? */
function looksLikeAccessPending(status: number, body: string): boolean {
  if (status !== 429) return false;
  return (
    /RESOURCE_EXHAUSTED/i.test(body) ||
    /quota_limit_value["\s:]+["']?0["']?/i.test(body) ||
    /"quotaValue"\s*:\s*"0"/i.test(body) ||
    /quota.*\b0\b/i.test(body)
  );
}

/** True when the error is the GBP "access not granted yet" state. */
export function isGbpAccessPendingError(err: unknown): boolean {
  if (err instanceof GbpAccessPendingError) return true;
  if (err instanceof GbpApiError) {
    return looksLikeAccessPending(err.status, err.message);
  }
  return false;
}

async function authedFetch<T>(
  url: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  return withRetry(
    async () => {
      const res = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
      });
      if (!res.ok) {
        const body = await res.text();
        if (looksLikeAccessPending(res.status, body)) {
          throw new GbpAccessPendingError(
            `${res.status} ${res.statusText}: ${body}`,
          );
        }
        throw new GbpApiError(
          res.status,
          `${res.status} ${res.statusText}: ${body}`,
        );
      }
      return (await res.json()) as T;
    },
    // Access-pending is a project-approval state — retrying wastes the
    // user's time and the page load. Everything else keeps default backoff.
    { retryable: (err) => isRetryableHttpError(err) && !(err instanceof GbpAccessPendingError) },
  );
}

// ---------------------------------------------------------------------------
// OAuth token exchange (low-level)
// ---------------------------------------------------------------------------
const tokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
  id_token: z.string().optional(),
});

export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope?: string;
  idToken?: string;
}> {
  const params = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "",
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    throw new GbpApiError(
      res.status,
      `Token exchange failed: ${await res.text()}`,
    );
  }
  const data = tokenResponseSchema.parse(await res.json());
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
    idToken: data.id_token,
  };
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    throw new GbpApiError(res.status, `Refresh failed: ${await res.text()}`);
  }
  const data = tokenResponseSchema.parse(await res.json());
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "",
    response_type: "code",
    scope: gbpScopes.join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Raw GBP API calls (token-only, no DB)
// ---------------------------------------------------------------------------
export async function listAccountsRaw(
  tokens: GbpTokens,
): Promise<GbpAccount[]> {
  if (!LIVE) return fixtureAccounts();
  const data = await authedFetch<{ accounts?: GbpAccount[] }>(
    `${ACCOUNT_BASE}/accounts`,
    tokens.accessToken,
  );
  return data.accounts ?? [];
}

export async function listLocationsRaw(
  tokens: GbpTokens,
  accountName: string,
): Promise<GbpLocation[]> {
  if (!LIVE) return fixtureLocations(accountName);
  const readMask = "name,title,storefrontAddress,primaryPhone,websiteUri";
  const url = `${BUSINESS_BASE}/${accountName}/locations?readMask=${encodeURIComponent(readMask)}&pageSize=100`;
  const data = await authedFetch<{ locations?: GbpLocation[] }>(
    url,
    tokens.accessToken,
  );
  return data.locations ?? [];
}

export async function listReviewsRaw(
  tokens: GbpTokens,
  accountName: string,
  locationName: string,
  pageToken?: string,
): Promise<{ reviews: GbpReview[]; nextPageToken?: string }> {
  if (!LIVE) return { reviews: fixtureReviews(locationName) };

  const url = new URL(
    `${REVIEWS_BASE}/${accountName}/${locationName}/reviews`,
  );
  url.searchParams.set("pageSize", "50");
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const data = await authedFetch<{
    reviews?: Array<{
      name: string;
      reviewId: string;
      reviewer: { displayName?: string; profilePhotoUrl?: string };
      starRating: keyof typeof starRatingMap;
      comment?: string;
      createTime: string;
      updateTime: string;
      reviewReply?: { comment: string; updateTime: string };
    }>;
    nextPageToken?: string;
  }>(url.toString(), tokens.accessToken);

  return {
    reviews:
      data.reviews?.map((r) => ({
        reviewId: r.reviewId,
        reviewer: r.reviewer,
        starRating: starRatingMap[r.starRating] ?? 3,
        comment: r.comment,
        createTime: r.createTime,
        updateTime: r.updateTime,
        reviewReply: r.reviewReply,
      })) ?? [],
    nextPageToken: data.nextPageToken,
  };
}

export async function postReviewReplyRaw(
  tokens: GbpTokens,
  accountName: string,
  locationName: string,
  reviewId: string,
  comment: string,
): Promise<{ comment: string; updateTime: string }> {
  if (!LIVE) {
    return { comment, updateTime: new Date().toISOString() };
  }
  const url = `${REVIEWS_BASE}/${accountName}/${locationName}/reviews/${reviewId}/reply`;
  return authedFetch<{ comment: string; updateTime: string }>(
    url,
    tokens.accessToken,
    { method: "PUT", body: JSON.stringify({ comment }) },
  );
}

// ---------------------------------------------------------------------------
// Fixtures (used when GBP_LIVE=false)
// ---------------------------------------------------------------------------
/**
 * Demo accounts/locations for clearly-labeled previews — e.g. while live GBP
 * API access is pending approval. Wraps the same fixtures used in demo mode so
 * the preview matches what the real UI will look like.
 */
export function demoGbpAccounts(): GbpAccount[] {
  return fixtureAccounts();
}

export function demoGbpLocations(accountName?: string): GbpLocation[] {
  return fixtureLocations(accountName ?? "accounts/demo-acct-1");
}

function fixtureAccounts(): GbpAccount[] {
  return [
    {
      name: "accounts/demo-acct-1",
      accountName: "AutoFiveStar Demo HVAC",
      type: "PERSONAL",
      email: "demo@autofivestar.com",
    },
    {
      name: "accounts/demo-acct-2",
      accountName: "AutoFiveStar Demo Dental",
      type: "PERSONAL",
      email: "demo@autofivestar.com",
    },
  ];
}

function fixtureLocations(accountName: string): GbpLocation[] {
  if (accountName === "accounts/demo-acct-2") {
    return [
      {
        name: "locations/demo-loc-3",
        title: "Bright Smile Dental — Downtown",
        storefrontAddress: {
          addressLines: ["456 Elm St"],
          locality: "Austin",
          administrativeArea: "TX",
          postalCode: "78702",
          regionCode: "US",
        },
        primaryPhone: "+1 555 020 2020",
        websiteUri: "https://example.com",
      },
      {
        name: "locations/demo-loc-4",
        title: "Bright Smile Dental — North",
        storefrontAddress: {
          addressLines: ["900 Burnet Rd"],
          locality: "Austin",
          administrativeArea: "TX",
          postalCode: "78757",
          regionCode: "US",
        },
        primaryPhone: "+1 555 020 2021",
      },
    ];
  }
  return [
    {
      name: "locations/demo-loc-1",
      title: "AutoFiveStar Demo HVAC — Austin",
      storefrontAddress: {
        addressLines: ["123 Main St"],
        locality: "Austin",
        administrativeArea: "TX",
        postalCode: "78701",
        regionCode: "US",
      },
      primaryPhone: "+1 555 010 1010",
      websiteUri: "https://autofivestar.com",
    },
    {
      name: "locations/demo-loc-2",
      title: "AutoFiveStar Demo HVAC — Round Rock",
      storefrontAddress: {
        addressLines: ["789 Round Rock Ave"],
        locality: "Round Rock",
        administrativeArea: "TX",
        postalCode: "78664",
        regionCode: "US",
      },
      primaryPhone: "+1 555 010 1011",
    },
  ];
}

const FIXTURE_REVIEW_TEMPLATES: Array<{
  rating: 1 | 2 | 3 | 4 | 5;
  reviewer: string;
  comment: string;
}> = [
  { rating: 5, reviewer: "Jamie L.", comment: "Technician was on time, fixed our AC fast, and explained everything. Will use again!" },
  { rating: 5, reviewer: "Morgan H.", comment: "Same-day service, fair price, polite team. Recommend." },
  { rating: 5, reviewer: "Taylor P.", comment: "These folks saved us during a heat wave. So grateful." },
  { rating: 4, reviewer: "Sam K.", comment: "Solid work, friendly team. Will use again." },
  { rating: 4, reviewer: "Dakota R.", comment: "Good communication. Minor scheduling delay but otherwise great." },
  { rating: 3, reviewer: "Casey M.", comment: "Service was OK. Felt the diagnosis took longer than it should have." },
  { rating: 3, reviewer: "Jordan B.", comment: "Decent, but the follow-up could have been better." },
  { rating: 2, reviewer: "Pat R.", comment: "Showed up an hour late and the estimate felt high. Service itself was OK." },
  { rating: 2, reviewer: "Quinn V.", comment: "Tech rushed and didn't fully explain the repair. Not the best experience." },
  { rating: 1, reviewer: "Riley G.", comment: "Felt the diagnosis was wrong. Had to call someone else who fixed it properly." },
  { rating: 1, reviewer: "Avery C.", comment: "No-show on the appointment window. Wasted half a day." },
];

function fixtureReviews(locationName: string): GbpReview[] {
  // Stable count per location id so refreshing produces the same fixture.
  const seed = Array.from(locationName).reduce(
    (acc, ch) => (acc + ch.charCodeAt(0)) % 1000,
    0,
  );
  const count = 8 + (seed % 5);
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const tpl = FIXTURE_REVIEW_TEMPLATES[
      (seed + i) % FIXTURE_REVIEW_TEMPLATES.length
    ]!;
    const ago = (i + 1) * 1000 * 60 * 60 * 6;
    return {
      reviewId: `${locationName.split("/").pop()}-rev-${i + 1}`,
      reviewer: { displayName: tpl.reviewer },
      starRating: tpl.rating,
      comment: tpl.comment,
      createTime: new Date(now - ago).toISOString(),
      updateTime: new Date(now - ago).toISOString(),
    };
  });
}

// ---------------------------------------------------------------------------
// Org-scoped helpers (token lookup + retry + DB persistence)
// ---------------------------------------------------------------------------

async function tokensForOrg(orgId: string): Promise<GbpTokens> {
  // Throws GoogleNotConnectedError / GoogleRefreshError on failure.
  const accessToken = await getValidGoogleAccessToken(orgId);
  return { accessToken };
}

export async function listGoogleBusinessAccounts(
  orgId: string,
): Promise<GbpAccount[]> {
  const tokens = await tokensForOrg(orgId);
  return listAccountsRaw(tokens);
}

export async function listGoogleBusinessLocations(
  orgId: string,
  accountName: string,
): Promise<GbpLocation[]> {
  const tokens = await tokensForOrg(orgId);
  return listLocationsRaw(tokens, accountName);
}

export type ConnectGoogleLocationInput = {
  orgId: string;
  userId: string;
  accountName: string; // "accounts/{id}"
  locationName: string; // "locations/{id}"
};

export async function connectGoogleLocation(
  input: ConnectGoogleLocationInput,
): Promise<Location> {
  const tokens = await tokensForOrg(input.orgId);
  const locations = await listLocationsRaw(tokens, input.accountName);
  const match = locations.find((l) => l.name === input.locationName);
  if (!match) {
    throw new Error(`Location ${input.locationName} not found under ${input.accountName}`);
  }

  const addr = match.storefrontAddress;
  const inserted = await db
    .insert(locationsTable)
    .values({
      orgId: input.orgId,
      source: "google",
      sourceLocationId: match.name,
      name: match.title,
      addressLine1: addr?.addressLines?.[0] ?? null,
      addressLine2: addr?.addressLines?.[1] ?? null,
      city: addr?.locality ?? null,
      state: addr?.administrativeArea ?? null,
      postalCode: addr?.postalCode ?? null,
      countryCode: addr?.regionCode ?? "US",
      phone: match.primaryPhone ?? null,
      websiteUrl: match.websiteUri ?? null,
      gbpAccountId: input.accountName,
      connectedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [locationsTable.source, locationsTable.sourceLocationId],
      set: {
        orgId: input.orgId,
        name: match.title,
        addressLine1: addr?.addressLines?.[0] ?? null,
        city: addr?.locality ?? null,
        state: addr?.administrativeArea ?? null,
        postalCode: addr?.postalCode ?? null,
        gbpAccountId: input.accountName,
        connectedAt: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning();

  const row = inserted[0];
  if (!row) throw new Error("Failed to persist connected location");

  await writeAudit({
    orgId: input.orgId,
    actorUserId: input.userId,
    action: "location.connected",
    targetType: "location",
    targetId: row.id,
    metadata: { source: "google", source_location_id: match.name },
  });

  return row;
}

export type PullReviewsResult = {
  locationId: string;
  fetched: number;
  inserted: number;
  updated: number;
  /** IDs of reviews that were freshly inserted on this run. */
  newReviewIds: string[];
};

export async function pullGoogleReviews(
  orgId: string,
  locationId: string,
): Promise<PullReviewsResult> {
  const locRows = await db
    .select()
    .from(locationsTable)
    .where(
      and(
        eq(locationsTable.id, locationId),
        eq(locationsTable.orgId, orgId),
        eq(locationsTable.source, "google"),
      ),
    )
    .limit(1);
  const loc = locRows[0];
  if (!loc) throw new Error("Location not found for org");
  if (!loc.gbpAccountId) throw new Error("Location is missing GBP account");

  const tokens = await tokensForOrg(orgId);
  const { reviews: fetched } = await listReviewsRaw(
    tokens,
    loc.gbpAccountId,
    loc.sourceLocationId,
  );

  let inserted = 0;
  let updated = 0;
  const newReviewIds: string[] = [];
  for (const r of fetched) {
    const values: NewReview = {
      orgId,
      locationId,
      source: "google",
      sourceReviewId: `${loc.sourceLocationId}/reviews/${r.reviewId}`,
      reviewerName: r.reviewer.displayName ?? null,
      reviewerAvatarUrl: r.reviewer.profilePhotoUrl ?? null,
      rating: r.starRating,
      body: r.comment ?? null,
      postedAt: new Date(r.createTime),
      lastSyncedAt: new Date(),
      status: r.reviewReply ? "posted" : "new",
    };
    // Postgres exposes xmax=0 on freshly INSERTed rows (UPDATEd rows expose
    // the transaction id that produced them, which is nonzero). This lets us
    // distinguish insert vs update with a single round-trip.
    const res = await db
      .insert(reviewsTable)
      .values(values)
      .onConflictDoUpdate({
        target: [reviewsTable.source, reviewsTable.sourceReviewId],
        set: {
          rating: values.rating,
          body: values.body,
          reviewerName: values.reviewerName,
          reviewerAvatarUrl: values.reviewerAvatarUrl,
          status: sql`case when ${reviewsTable.status} in ('approved','posted')
                       then ${reviewsTable.status}
                       else ${values.status} end`,
          lastSyncedAt: values.lastSyncedAt,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: reviewsTable.id,
        inserted: sql<boolean>`(xmax = 0)`.as("inserted"),
      });
    const row = res[0];
    if (!row) continue;
    if (row.inserted) {
      inserted += 1;
      newReviewIds.push(row.id);
    } else {
      updated += 1;
    }
  }

  await writeAudit({
    orgId,
    action: "review.synced",
    targetType: "location",
    targetId: locationId,
    metadata: { fetched: fetched.length, inserted, updated },
  });

  return {
    locationId,
    fetched: fetched.length,
    inserted,
    updated,
    newReviewIds,
  };
}

/**
 * Stub placeholder for PR #5 / #6 wiring. Throws if not connected so
 * callers get a typed signal during integration testing.
 */
export async function postGoogleReviewReply(args: {
  orgId: string;
  reviewId: string;
  body: string;
}): Promise<{ comment: string; updateTime: string }> {
  void args;
  // Implemented in PR #5: looks up the review's location + source_review_id,
  // calls postReviewReplyRaw, persists review_response row + audit log.
  throw new GoogleNotConnectedError("postGoogleReviewReply not wired yet (PR #5)");
}

// Backwards-compatible aliases (still used by inngest stubs etc.)
export const listAccounts = listAccountsRaw;
export const listLocations = listLocationsRaw;
export const listReviews = listReviewsRaw;
export const postReviewReply = postReviewReplyRaw;

export { GBP_LIVE_MODE };
const GBP_LIVE_MODE = LIVE;
