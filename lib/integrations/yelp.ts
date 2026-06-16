/**
 * Yelp Fusion API (read-only).
 *
 * Yelp Fusion only returns up to 3 reviews per business and excerpts of each
 * review's body (~160 chars). We expose this surface honestly: drafts can be
 * generated but the "post to Yelp" button is disabled in the UI.
 */

const BASE = "https://api.yelp.com/v3";

export type YelpReview = {
  id: string;
  rating: number;
  text: string;
  time_created: string;
  url: string;
  user: { id: string; name: string; profile_url?: string; image_url?: string };
};

function key(): string | null {
  return process.env.YELP_API_KEY ?? null;
}

async function authedFetch<T>(path: string): Promise<T> {
  const k = key();
  if (!k) throw new Error("YELP_API_KEY not configured");
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${k}` },
  });
  if (!res.ok) {
    throw new Error(`Yelp API ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export async function fetchYelpReviews(
  yelpBusinessId: string,
): Promise<YelpReview[]> {
  if (!key()) {
    // Fixture for dev
    return [
      {
        id: "yelp-demo-1",
        rating: 5,
        text: "Great service, fast and friendly. Would recommend.",
        time_created: new Date().toISOString(),
        url: "https://www.yelp.com/biz/demo",
        user: { id: "u1", name: "Alex M." },
      },
    ];
  }
  const data = await authedFetch<{ reviews: YelpReview[] }>(
    `/businesses/${encodeURIComponent(yelpBusinessId)}/reviews?limit=3`,
  );
  return data.reviews;
}
