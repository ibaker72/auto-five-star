import "server-only";
import { and, eq, gt, gte, inArray, sql } from "drizzle-orm";
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

export type CampaignProgress = {
  sent: number;
  pending: number;
  failed: number;
  total: number;
  nextScheduledAt: Date | null;
};

/**
 * Per-campaign send progress for the campaigns list — sent / pending / failed
 * counts plus the next upcoming scheduled send window (for drip campaigns).
 * Returns an empty map when there are no campaign ids.
 */
export async function computeCampaignProgress(
  orgId: string,
  campaignIds: string[],
): Promise<Map<string, CampaignProgress>> {
  const out = new Map<string, CampaignProgress>();
  if (campaignIds.length === 0) return out;

  const statusRows = await db
    .select({
      campaignId: reviewRequestRecipients.campaignId,
      status: reviewRequestRecipients.status,
      total: sql<number>`count(*)::int`,
    })
    .from(reviewRequestRecipients)
    .where(
      and(
        eq(reviewRequestRecipients.orgId, orgId),
        inArray(reviewRequestRecipients.campaignId, campaignIds),
      ),
    )
    .groupBy(
      reviewRequestRecipients.campaignId,
      reviewRequestRecipients.status,
    );

  const nextRows = await db
    .select({
      campaignId: reviewRequestRecipients.campaignId,
      nextAt: sql<Date | null>`min(${reviewRequestRecipients.scheduledAt})`,
    })
    .from(reviewRequestRecipients)
    .where(
      and(
        eq(reviewRequestRecipients.orgId, orgId),
        inArray(reviewRequestRecipients.campaignId, campaignIds),
        eq(reviewRequestRecipients.status, "pending"),
        gt(reviewRequestRecipients.scheduledAt, new Date()),
      ),
    )
    .groupBy(reviewRequestRecipients.campaignId);

  const nextById = new Map<string, Date | null>();
  for (const r of nextRows) {
    nextById.set(r.campaignId, r.nextAt ? new Date(r.nextAt) : null);
  }

  for (const id of campaignIds) {
    out.set(id, {
      sent: 0,
      pending: 0,
      failed: 0,
      total: 0,
      nextScheduledAt: nextById.get(id) ?? null,
    });
  }

  for (const r of statusRows) {
    const p = out.get(r.campaignId);
    if (!p) continue;
    const n = Number(r.total);
    p.total += n;
    if (r.status === "sent" || r.status === "clicked" || r.status === "reviewed") {
      p.sent += n;
    } else if (r.status === "failed" || r.status === "skipped") {
      p.failed += n;
    } else if (r.status === "pending") {
      p.pending += n;
    }
  }

  return out;
}
