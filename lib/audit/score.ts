/**
 * Reputation score engine.
 *
 * Deterministic 0-100 score derived from four dimensions:
 *   - Average rating (40 pts)
 *   - Review volume   (20 pts)
 *   - Recency         (20 pts)
 *   - Response rate   (20 pts)
 *
 * No AI / no external calls. Same inputs always produce the same output, so
 * an audit can be replayed for support or testing without surprise.
 */

export type ReputationInputs = {
  averageRating: number | null; // 0..5, null when no reviews
  reviewCount: number; // total reviews
  lastReviewAt: Date | null;
  responseRate: number | null; // 0..1, null when no reviews
};

export type ReputationReport = {
  score: number; // 0..100
  grade: "A" | "B" | "C" | "D" | "F";
  breakdown: {
    rating: number;
    volume: number;
    recency: number;
    response: number;
  };
  strengths: string[];
  opportunities: string[];
  recommendations: string[];
};

const RATING_WEIGHT = 40;
const VOLUME_WEIGHT = 20;
const RECENCY_WEIGHT = 20;
const RESPONSE_WEIGHT = 20;

const VOLUME_TARGET = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function gradeFor(score: number): ReputationReport["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function recencyFactor(lastReviewAt: Date | null, now: Date): number {
  if (!lastReviewAt) return 0;
  const ageDays = (now.getTime() - lastReviewAt.getTime()) / DAY_MS;
  if (ageDays < 0) return 1;
  if (ageDays <= 30) return 1;
  if (ageDays >= 365) return 0;
  // Linear decay between 30 and 365 days.
  return 1 - (ageDays - 30) / (365 - 30);
}

/**
 * Compute a reputation report from inputs. Pure function.
 */
export function computeReputationReport(
  inputs: ReputationInputs,
  options: { now?: Date } = {},
): ReputationReport {
  const now = options.now ?? new Date();
  const hasReviews = inputs.reviewCount > 0 && inputs.averageRating !== null;

  const ratingFraction = hasReviews
    ? clamp01((inputs.averageRating ?? 0) / 5)
    : 0;
  const volumeFraction = clamp01(inputs.reviewCount / VOLUME_TARGET);
  const recencyFraction = recencyFactor(inputs.lastReviewAt, now);
  const responseFraction = clamp01(inputs.responseRate ?? 0);

  const rating = Math.round(ratingFraction * RATING_WEIGHT);
  const volume = Math.round(volumeFraction * VOLUME_WEIGHT);
  const recency = Math.round(recencyFraction * RECENCY_WEIGHT);
  const response = Math.round(responseFraction * RESPONSE_WEIGHT);
  const score = Math.min(100, rating + volume + recency + response);

  const strengths: string[] = [];
  const opportunities: string[] = [];
  const recommendations: string[] = [];

  // Rating
  if (ratingFraction >= 0.9) {
    strengths.push("Your average rating signals strong customer satisfaction.");
  } else if (ratingFraction < 0.8 && hasReviews) {
    opportunities.push(
      "Average rating has room to grow — even one 5-star review per week moves the needle quickly.",
    );
    recommendations.push(
      "Ask happy customers to leave a Google review the day of service while the experience is fresh.",
    );
  }

  // Volume
  if (volumeFraction >= 0.5) {
    strengths.push("You have a healthy volume of public reviews.");
  } else {
    opportunities.push(
      "Review volume is below the local-business benchmark of ~200 reviews.",
    );
    recommendations.push(
      "Set a weekly review-request cadence (email + SMS) tied to invoice or appointment completion.",
    );
  }

  // Recency
  if (recencyFraction >= 0.8) {
    strengths.push(
      "Recent reviews show prospective customers you're still operating and engaged.",
    );
  } else if (recencyFraction === 0) {
    opportunities.push(
      "We didn't see a recent public review — prospects often interpret stale review lists as warning signs.",
    );
    recommendations.push(
      "Run a 30-day push to ask the last 50 served customers for a quick review.",
    );
  } else if (recencyFraction < 0.5) {
    opportunities.push(
      "Your last review was a while ago — keep the trickle going so the profile feels alive.",
    );
  }

  // Response rate
  if (responseFraction >= 0.8) {
    strengths.push(
      "You respond to most reviews, which builds trust with future customers.",
    );
  } else if (responseFraction < 0.5) {
    opportunities.push(
      "Many reviews go unanswered. Replies are public and can win back wavering shoppers.",
    );
    recommendations.push(
      "Use AutoFiveStar to draft on-brand replies in seconds — approve and post in one click.",
    );
  }

  // If we had no real data at all, lead with a clear note.
  if (!hasReviews) {
    opportunities.unshift(
      "We couldn't read any reviews for this profile yet — the score is a baseline you can grow from.",
    );
    recommendations.unshift(
      "Make sure your Google Business Profile is claimed and verified, then start asking customers for reviews.",
    );
  }

  return {
    score,
    grade: gradeFor(score),
    breakdown: { rating, volume, recency, response },
    strengths,
    opportunities,
    recommendations,
  };
}

/**
 * Generate a plausible (and clearly-labeled) demo report for a new lead.
 *
 * No live review data is available at lead-capture time — Google Places /
 * GBP both require auth scopes we don't have for an unauthenticated prospect.
 * We derive a seeded set of inputs from the email so the same lead refreshing
 * sees a stable score, and label the report `demo_mode=true` in the DB.
 */
export function buildDemoInputs(seed: string, options: { now?: Date } = {}): {
  inputs: ReputationInputs;
  rationale: string;
} {
  const now = options.now ?? new Date();
  const h = hashSeed(seed);
  // Average rating between 3.6 and 4.8 (a believable real range).
  const averageRating = Number((3.6 + ((h % 12) / 10)).toFixed(1));
  // Review count between 18 and 200 (small-business range).
  const reviewCount = 18 + (h % 183);
  // Last review somewhere between 2 and 90 days ago.
  const daysAgo = 2 + (h % 88);
  const lastReviewAt = new Date(now.getTime() - daysAgo * DAY_MS);
  // Response rate between 0.10 and 0.65 (most SMBs are bad at this).
  const responseRate = Number((0.1 + ((h % 56) / 100)).toFixed(2));

  return {
    inputs: {
      averageRating,
      reviewCount,
      lastReviewAt,
      responseRate,
    },
    rationale:
      "Demo mode: we don't have direct access to your Google reviews yet, so this report uses a representative sample. Connect your Google Business Profile inside AutoFiveStar to see your real numbers.",
  };
}

function hashSeed(seed: string): number {
  // FNV-1a 32-bit, returns a non-negative int.
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h;
}
