/**
 * Google Business Profile client.
 *
 * Operates in two modes based on GBP_LIVE env flag:
 *   - "false": returns fixture data for local dev / demo until Google approves
 *              the business.manage scope on the production OAuth client.
 *   - "true":  hits the live GBP REST APIs.
 *
 * The shape returned in fixture mode mirrors the live response surface so that
 * upstream callers do not branch on the flag.
 */

import { z } from "zod";

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
  name: string; // "accounts/{id}"
  accountName: string;
  type: string;
  email?: string;
};

export type GbpLocation = {
  name: string; // "locations/{id}"
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
  createTime: string; // ISO
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

async function authedFetch<T>(
  url: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
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
    throw new GbpApiError(res.status, `${res.status} ${res.statusText}: ${body}`);
  }
  return (await res.json()) as T;
}

export class GbpApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "GbpApiError";
  }
}

// ---------------------------------------------------------------------------
// Token exchange
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
    throw new GbpApiError(res.status, `Token exchange failed: ${await res.text()}`);
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
// Accounts / locations / reviews
// ---------------------------------------------------------------------------
// PR #4 will call `requireEntitlement(orgId, "locations.connect")` from
// `lib/billing/entitlements` before persisting a new location selection.

export async function listAccounts(tokens: GbpTokens): Promise<GbpAccount[]> {
  if (!LIVE) {
    return [
      {
        name: "accounts/demo-acct-1",
        accountName: "AutoFiveStar Demo Account",
        type: "PERSONAL",
        email: "demo@autofivestar.com",
      },
    ];
  }
  const data = await authedFetch<{ accounts?: GbpAccount[] }>(
    `${ACCOUNT_BASE}/accounts`,
    tokens.accessToken,
  );
  return data.accounts ?? [];
}

export async function listLocations(
  tokens: GbpTokens,
  accountName: string,
): Promise<GbpLocation[]> {
  if (!LIVE) {
    return [
      {
        name: "locations/demo-loc-1",
        title: "AutoFiveStar Demo HVAC",
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
    ];
  }
  const readMask = "name,title,storefrontAddress,primaryPhone,websiteUri";
  const url = `${BUSINESS_BASE}/${accountName}/locations?readMask=${encodeURIComponent(readMask)}&pageSize=100`;
  const data = await authedFetch<{ locations?: GbpLocation[] }>(
    url,
    tokens.accessToken,
  );
  return data.locations ?? [];
}

export async function listReviews(
  tokens: GbpTokens,
  accountName: string,
  locationName: string,
  pageToken?: string,
): Promise<{ reviews: GbpReview[]; nextPageToken?: string }> {
  if (!LIVE) {
    return {
      reviews: [
        {
          reviewId: "demo-rev-1",
          reviewer: { displayName: "Jamie L." },
          starRating: 5,
          comment:
            "The technician was on time, fixed our AC fast, and explained everything.",
          createTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          updateTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        },
        {
          reviewId: "demo-rev-2",
          reviewer: { displayName: "Pat R." },
          starRating: 2,
          comment:
            "Showed up an hour late and the estimate felt high. Service itself was OK.",
          createTime: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
          updateTime: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        },
        {
          reviewId: "demo-rev-3",
          reviewer: { displayName: "Sam K." },
          starRating: 4,
          comment: "Solid work, friendly team. Will use again.",
          createTime: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
          updateTime: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
        },
      ],
    };
  }
  // GBP reviews live on the legacy v4 endpoint, keyed by account/location.
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

export async function postReviewReply(
  tokens: GbpTokens,
  accountName: string,
  locationName: string,
  reviewId: string,
  comment: string,
): Promise<{ comment: string; updateTime: string }> {
  if (!LIVE) {
    return {
      comment,
      updateTime: new Date().toISOString(),
    };
  }
  const url = `${REVIEWS_BASE}/${accountName}/${locationName}/reviews/${reviewId}/reply`;
  return authedFetch<{ comment: string; updateTime: string }>(
    url,
    tokens.accessToken,
    {
      method: "PUT",
      body: JSON.stringify({ comment }),
    },
  );
}
