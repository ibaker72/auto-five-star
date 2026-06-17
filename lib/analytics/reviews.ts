import "server-only";
import { and, count, eq, gte, lte, max, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reviews } from "@/lib/db/schema";

export type ReviewAnalytics = {
  totalReviews: number;
  averageRating: number | null;
  reviewsThisWeek: number;
  reviewsThisMonth: number;
  unanswered: number;
  urgentUnanswered: number; // 1-2 star, not posted
  postedCount: number;
  /** Percent (0-100). null when there are no reviews. */
  responseRate: number | null;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  /** Bucket counts per week, oldest → newest. Always 8 buckets. */
  trend: Array<{ weekStart: Date; count: number; avgRating: number | null }>;
  lastSyncedAt: Date | null;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  // Monday-start weeks (US owners care less; this is just for bucketing).
  const day = out.getDay(); // 0 = Sun, 1 = Mon
  const diff = day === 0 ? 6 : day - 1;
  out.setDate(out.getDate() - diff);
  return out;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Compute review analytics for an org. All counts are scoped by org and
 * optionally narrowed to a single location.
 */
export async function computeReviewAnalytics(args: {
  orgId: string;
  locationId?: string | null;
  now?: Date;
}): Promise<ReviewAnalytics> {
  const now = args.now ?? new Date();
  const weekStart = new Date(now.getTime() - WEEK_MS);
  const monthStart = startOfMonth(now);
  const trendStart = startOfWeek(new Date(now.getTime() - 7 * WEEK_MS));

  const scope = args.locationId
    ? and(
        eq(reviews.orgId, args.orgId),
        eq(reviews.locationId, args.locationId),
      )!
    : eq(reviews.orgId, args.orgId);

  const [
    totals,
    thisWeekRow,
    thisMonthRow,
    unansweredRow,
    urgentRow,
    postedRow,
    distRows,
    trendRows,
  ] = await Promise.all([
    db
      .select({
        total: count(reviews.id),
        avg: sql<string | null>`avg(${reviews.rating})`.as("avg"),
        lastSyncedAt: max(reviews.lastSyncedAt),
      })
      .from(reviews)
      .where(scope)
      .then((r) => r[0]),
    db
      .select({ total: count(reviews.id) })
      .from(reviews)
      .where(and(scope, gte(reviews.postedAt, weekStart)))
      .then((r) => r[0]),
    db
      .select({ total: count(reviews.id) })
      .from(reviews)
      .where(and(scope, gte(reviews.postedAt, monthStart)))
      .then((r) => r[0]),
    db
      .select({ total: count(reviews.id) })
      .from(reviews)
      .where(
        and(
          scope,
          sql`${reviews.status} in ('new','drafted','approved','flagged')`,
        ),
      )
      .then((r) => r[0]),
    db
      .select({ total: count(reviews.id) })
      .from(reviews)
      .where(
        and(
          scope,
          lte(reviews.rating, 2),
          sql`${reviews.status} in ('new','drafted','flagged')`,
        ),
      )
      .then((r) => r[0]),
    db
      .select({ total: count(reviews.id) })
      .from(reviews)
      .where(and(scope, eq(reviews.status, "posted")))
      .then((r) => r[0]),
    db
      .select({
        rating: reviews.rating,
        total: count(reviews.id),
      })
      .from(reviews)
      .where(scope)
      .groupBy(reviews.rating),
    db
      .select({
        rating: reviews.rating,
        postedAt: reviews.postedAt,
      })
      .from(reviews)
      .where(and(scope, gte(reviews.postedAt, trendStart)))
      .orderBy(reviews.postedAt),
  ]);

  const totalReviews = Number(totals?.total ?? 0);
  const averageRating = totals?.avg ? Number(totals.avg) : null;
  const postedCount = Number(postedRow?.total ?? 0);
  const responseRate =
    totalReviews === 0 ? null : Math.round((postedCount / totalReviews) * 100);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<
    1 | 2 | 3 | 4 | 5,
    number
  >;
  for (const row of distRows) {
    const r = row.rating;
    if (r >= 1 && r <= 5) {
      distribution[r as 1 | 2 | 3 | 4 | 5] = Number(row.total);
    }
  }

  // Build 8 weekly buckets from trendStart → now.
  const buckets: Array<{
    weekStart: Date;
    count: number;
    ratingSum: number;
  }> = [];
  for (let i = 0; i < 8; i++) {
    const start = new Date(trendStart.getTime() + i * WEEK_MS);
    buckets.push({ weekStart: start, count: 0, ratingSum: 0 });
  }
  for (const r of trendRows) {
    const idx = Math.floor(
      (r.postedAt.getTime() - trendStart.getTime()) / WEEK_MS,
    );
    if (idx >= 0 && idx < buckets.length) {
      buckets[idx]!.count += 1;
      buckets[idx]!.ratingSum += r.rating;
    }
  }
  const trend = buckets.map((b) => ({
    weekStart: b.weekStart,
    count: b.count,
    avgRating: b.count === 0 ? null : Number((b.ratingSum / b.count).toFixed(2)),
  }));

  return {
    totalReviews,
    averageRating: averageRating === null ? null : Number(averageRating.toFixed(2)),
    reviewsThisWeek: Number(thisWeekRow?.total ?? 0),
    reviewsThisMonth: Number(thisMonthRow?.total ?? 0),
    unanswered: Number(unansweredRow?.total ?? 0),
    urgentUnanswered: Number(urgentRow?.total ?? 0),
    postedCount,
    responseRate,
    ratingDistribution: distribution,
    trend,
    lastSyncedAt: totals?.lastSyncedAt ?? null,
  };
}
