import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reviewRequestRecipients } from "@/lib/db/schema";

export type ReviewRequestAnalytics = {
  sent: number;
  pending: number;
  failed: number;
  clicked: number;
  reviewed: number;
  last30Days: number;
};

/**
 * Aggregate counts for the review-request engine UI. Uses the recipients
 * table directly — events are append-only and ideal for trend lines, but for
 * the headline tiles we want the canonical "most recent state" per recipient.
 */
export async function computeReviewRequestAnalytics(
  orgId: string,
): Promise<ReviewRequestAnalytics> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      status: reviewRequestRecipients.status,
      total: sql<number>`count(*)::int`,
    })
    .from(reviewRequestRecipients)
    .where(eq(reviewRequestRecipients.orgId, orgId))
    .groupBy(reviewRequestRecipients.status);

  const byStatus: Record<string, number> = {};
  for (const r of rows) {
    byStatus[r.status] = Number(r.total);
  }

  const recentRows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(reviewRequestRecipients)
    .where(
      and(
        eq(reviewRequestRecipients.orgId, orgId),
        gte(reviewRequestRecipients.createdAt, thirtyDaysAgo),
      ),
    );

  const last30Days = Number(recentRows[0]?.total ?? 0);

  return {
    sent: (byStatus.sent ?? 0) + (byStatus.clicked ?? 0) + (byStatus.reviewed ?? 0),
    pending: byStatus.pending ?? 0,
    failed: (byStatus.failed ?? 0) + (byStatus.skipped ?? 0),
    clicked: (byStatus.clicked ?? 0) + (byStatus.reviewed ?? 0),
    reviewed: byStatus.reviewed ?? 0,
    last30Days,
  };
}
