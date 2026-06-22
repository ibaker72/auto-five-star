import "server-only";
import { HttpError, isRetryableHttpError, withRetry } from "./_retry";

/**
 * Google Places API (New) — read-only public business lookup.
 *
 * Used by the public free-audit funnel to enrich a submitted business name +
 * city with real Google data (rating, review count) and to find nearby
 * competitors for comparison.
 *
 * Graceful degradation: every public entry point here returns null / [] when
 * GOOGLE_PLACES_API_KEY is missing or any call fails. The caller
 * (lib/audit/leads.ts) then falls back to the clearly-labeled sample/demo
 * report. This keeps the funnel resilient: a Places hiccup must never turn a
 * captured lead into an error page, and production without the key behaves
 * exactly as it did before (sample mode).
 *
 * The key is read from process.env at call time and only ever used in a
 * server-side request header — it is never sent to the client.
 */

const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.rating",
  "places.userRatingCount",
  "places.formattedAddress",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.types",
].join(",");

export type PlaceMatch = {
  placeId: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  formattedAddress: string | null;
  primaryType: string | null;
  primaryTypeDisplayName: string | null;
  types: string[];
};

type RawPlace = {
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  formattedAddress?: string;
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
};

function apiKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY || null;
}

export function isPlacesConfigured(): boolean {
  return apiKey() !== null;
}

function normalizePlace(p: RawPlace): PlaceMatch | null {
  if (!p.id || !p.displayName?.text) return null;
  return {
    placeId: p.id,
    name: p.displayName.text,
    rating: typeof p.rating === "number" ? p.rating : null,
    reviewCount:
      typeof p.userRatingCount === "number" ? p.userRatingCount : null,
    formattedAddress: p.formattedAddress ?? null,
    primaryType: p.primaryType ?? null,
    primaryTypeDisplayName: p.primaryTypeDisplayName?.text ?? null,
    types: p.types ?? [],
  };
}

async function textSearch(
  textQuery: string,
  maxResultCount: number,
): Promise<PlaceMatch[]> {
  const key = apiKey();
  if (!key) return [];

  const data = await withRetry(
    async () => {
      const res = await fetch(TEXT_SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount,
          languageCode: "en",
        }),
      });
      if (!res.ok) {
        throw new HttpError(
          res.status,
          `Places searchText ${res.status}: ${await res.text()}`,
        );
      }
      return (await res.json()) as { places?: RawPlace[] };
    },
    { retryable: isRetryableHttpError },
  );

  return (data.places ?? [])
    .map(normalizePlace)
    .filter((p): p is PlaceMatch => p !== null);
}

/**
 * Look up a single business by name (+ optional city). Returns the best match
 * or null when Places is unavailable, the call fails, or nothing matches.
 */
export async function findBusinessOnPlaces(
  businessName: string,
  city: string | null,
): Promise<PlaceMatch | null> {
  if (!apiKey()) return null;
  const query = city ? `${businessName} ${city}` : businessName;
  try {
    const results = await textSearch(query, 1);
    return results[0] ?? null;
  } catch (err) {
    console.error(
      "[places] findBusinessOnPlaces failed",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

/**
 * Find up to `limit` nearby competitors of the same broad category. Uses the
 * matched business's primary type (falling back to a generic "businesses"
 * query) scoped to the city. Excludes the business itself by place id.
 * Returns [] on any failure.
 */
export async function findCompetitors(args: {
  business: PlaceMatch;
  city: string | null;
  limit?: number;
}): Promise<PlaceMatch[]> {
  if (!apiKey()) return [];
  const limit = args.limit ?? 3;
  const category =
    args.business.primaryTypeDisplayName ||
    humanizeType(args.business.primaryType) ||
    "businesses";
  const query = args.city ? `${category} in ${args.city}` : category;

  try {
    // Over-fetch so we can drop the business itself and still return `limit`.
    const results = await textSearch(query, limit + 4);
    return results
      .filter((p) => p.placeId !== args.business.placeId)
      .filter((p) => p.rating !== null && p.reviewCount !== null)
      .slice(0, limit);
  } catch (err) {
    console.error(
      "[places] findCompetitors failed",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

function humanizeType(type: string | null): string | null {
  if (!type) return null;
  return type.replace(/_/g, " ");
}
