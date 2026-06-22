import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reviewRequestRecipients } from "@/lib/db/schema";
import {
  computeCampaignMetrics,
  emptyCounts,
  type CampaignMetrics,
} from "./campaign-analytics";

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

/**
 * Per-campaign analytics for the campaigns list / ROI view. Aggregates the
 * recipient table using its cumulative timestamp columns (sent_at / clicked_at
 * / reviewed_at) so clicks and attributed reviews are counted accurately even
 * though `status` only holds the latest state. Returns a map keyed by campaign
 * id (every requested id is present, zero-filled if it has no recipients).
 */
export async function getCampaignAnalytics(
  orgId: string,
  campaignIds: string[],
): Promise<Map<string, CampaignMetrics>> {
  const out = new Map<string, CampaignMetrics>();
  if (campaignIds.length === 0) return out;

  // Seed every requested campaign with zeroes so callers never get undefined.
  for (const id of campaignIds) {
    out.set(id, computeCampaignMetrics(emptyCounts()));
  }

  const rows = await db
    .select({
      campaignId: reviewRequestRecipients.campaignId,
      total: sql<number>`count(*)::int`,
      sent: sql<number>`(count(*) filter (where ${reviewRequestRecipients.sentAt} is not null))::int`,
      pending: sql<number>`(count(*) filter (where ${reviewRequestRecipients.status} = 'pending'))::int`,
      failed: sql<number>`(count(*) filter (where ${reviewRequestRecipients.status} = 'failed'))::int`,
      skipped: sql<number>`(count(*) filter (where ${reviewRequestRecipients.status} = 'skipped'))::int`,
      clicked: sql<number>`(count(*) filter (where ${reviewRequestRecipients.clickedAt} is not null))::int`,
      reviews: sql<number>`(count(*) filter (where ${reviewRequestRecipients.reviewedAt} is not null))::int`,
      lastSentAt: sql<Date | null>`max(${reviewRequestRecipients.sentAt})`,
      nextScheduledAt: sql<Date | null>`min(${reviewRequestRecipients.scheduledAt}) filter (where ${reviewRequestRecipients.status} = 'pending' and ${reviewRequestRecipients.scheduledAt} > now())`,
    })
    .from(reviewRequestRecipients)
    .where(
      and(
        eq(reviewRequestRecipients.orgId, orgId),
        inArray(reviewRequestRecipients.campaignId, campaignIds),
      ),
    )
    .groupBy(reviewRequestRecipients.campaignId);

  for (const r of rows) {
    out.set(
      r.campaignId,
      computeCampaignMetrics({
        total: Number(r.total),
        sent: Number(r.sent),
        pending: Number(r.pending),
        failed: Number(r.failed),
        skipped: Number(r.skipped),
        clicked: Number(r.clicked),
        reviews: Number(r.reviews),
        lastSentAt: r.lastSentAt ? new Date(r.lastSentAt) : null,
        nextScheduledAt: r.nextScheduledAt ? new Date(r.nextScheduledAt) : null,
      }),
    );
  }

  return out;
}
