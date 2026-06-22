import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { inngest } from "../client";
import { db } from "@/lib/db/client";
import {
  reviewRequestCampaigns,
  reviewRequestEvents,
  reviewRequestRecipients,
} from "@/lib/db/schema";
import { getOrgName, sendReviewRequest } from "@/lib/review-requests/send";
import { canSendSmsReviewRequests } from "@/lib/billing/entitlements";
import {
  isCampaignSendable,
  selectDueRecipients,
  shouldSkipForEntitlement,
  summarizeBatch,
  type BatchResult,
} from "@/lib/review-requests/schedule";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Drip Campaign Scheduler.
 *
 * Runs hourly, finds scheduled review-request campaigns with due recipients,
 * and sends them gradually while respecting each campaign's daily limit. It
 * reuses the existing single-send path (`sendReviewRequest`) so provider logic
 * is never duplicated.
 *
 * Safety / idempotency:
 *  - Only ever acts on campaigns in a sendable status (never paused/archived/
 *    completed) — re-checked freshly inside the per-campaign step.
 *  - Only "pending" recipients are selected, and the send marks them sent, so a
 *    step retry never double-sends.
 *  - The daily limit is enforced as a rolling 24h window backstop on top of the
 *    pre-computed per-recipient schedule.
 *  - SMS recipients are skipped (not failed) when the org loses SMS entitlement.
 *  - A single bad send is caught and recorded; it never aborts the batch.
 */
export const dripCampaignScheduler = inngest.createFunction(
  {
    id: "drip-campaign-scheduler",
    retries: 2,
    triggers: { cron: "0 * * * *" },
  },
  async ({ step }) => {
    const campaigns = await step.run("find-scheduled-campaigns", async () => {
      return db
        .select({ id: reviewRequestCampaigns.id })
        .from(reviewRequestCampaigns)
        .where(
          and(
            eq(reviewRequestCampaigns.sendMode, "scheduled"),
            inArray(reviewRequestCampaigns.status, ["scheduled", "sending"]),
          ),
        );
    });

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const { id } of campaigns) {
      const res = await step.run(`drip-${id}`, () => processCampaign(id));
      sent += res.sent;
      skipped += res.skipped;
      failed += res.failed;
    }

    return { campaigns: campaigns.length, sent, skipped, failed };
  },
);

async function markCompleted(campaignId: string): Promise<void> {
  await db
    .update(reviewRequestCampaigns)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(reviewRequestCampaigns.id, campaignId));
}

async function countPending(campaignId: string): Promise<number> {
  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(reviewRequestRecipients)
    .where(
      and(
        eq(reviewRequestRecipients.campaignId, campaignId),
        eq(reviewRequestRecipients.status, "pending"),
      ),
    );
  return Number(rows[0]?.c ?? 0);
}

export async function processCampaign(campaignId: string): Promise<{
  sent: number;
  skipped: number;
  failed: number;
  reason?: string;
}> {
  const now = new Date();

  // Re-load fresh so a pause/archive/delete between scheduling and this run is
  // always respected.
  const [campaign] = await db
    .select()
    .from(reviewRequestCampaigns)
    .where(eq(reviewRequestCampaigns.id, campaignId))
    .limit(1);

  if (!campaign || !isCampaignSendable(campaign.status)) {
    return { sent: 0, skipped: 0, failed: 0, reason: "not_sendable" };
  }
  if (!campaign.googleReviewUrl) {
    return { sent: 0, skipped: 0, failed: 0, reason: "missing_review_url" };
  }

  // Rolling-window backstop: how many already went out in the last 24h.
  const windowStart = new Date(now.getTime() - DAY_MS);
  const sentRows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(reviewRequestRecipients)
    .where(
      and(
        eq(reviewRequestRecipients.campaignId, campaignId),
        eq(reviewRequestRecipients.status, "sent"),
        gte(reviewRequestRecipients.sentAt, windowStart),
      ),
    );
  const sentInWindow = Number(sentRows[0]?.c ?? 0);

  const pending = await db
    .select({
      id: reviewRequestRecipients.id,
      status: reviewRequestRecipients.status,
      scheduledAt: reviewRequestRecipients.scheduledAt,
      channel: reviewRequestRecipients.channel,
      customerName: reviewRequestRecipients.customerName,
      customerEmail: reviewRequestRecipients.customerEmail,
      customerPhone: reviewRequestRecipients.customerPhone,
    })
    .from(reviewRequestRecipients)
    .where(
      and(
        eq(reviewRequestRecipients.campaignId, campaignId),
        eq(reviewRequestRecipients.status, "pending"),
      ),
    );

  const due = selectDueRecipients(pending, {
    now,
    dailyLimit: campaign.dailyLimit ?? null,
    sentInWindow,
  });

  if (due.length === 0) {
    if (pending.length === 0) await markCompleted(campaignId);
    return { sent: 0, skipped: 0, failed: 0, reason: "nothing_due" };
  }

  // First batch flips a "scheduled" campaign into "sending".
  if (campaign.status === "scheduled") {
    await db
      .update(reviewRequestCampaigns)
      .set({ status: "sending", updatedAt: now })
      .where(eq(reviewRequestCampaigns.id, campaignId));
  }

  const businessName = await getOrgName(campaign.orgId);
  const smsEntitled = (await canSendSmsReviewRequests(campaign.orgId)).ok;

  const results: BatchResult[] = [];
  for (const r of due) {
    const channel = (r.channel ?? "email") as "email" | "sms";

    if (shouldSkipForEntitlement(channel, { smsEntitled })) {
      await markRecipientSkipped(r.id, "sms_not_entitled");
      await recordRecipientEvent(campaign.orgId, campaignId, r.id, "skipped", {
        channel,
        error: "sms_not_entitled",
      });
      results.push({ status: "skipped" });
      continue;
    }

    try {
      const result = await sendReviewRequest({
        recipientId: r.id,
        orgId: campaign.orgId,
        campaignId,
        channel,
        messageTemplate: campaign.messageTemplate,
        businessName,
        reviewUrl: campaign.googleReviewUrl,
        customer: {
          name: r.customerName,
          email: r.customerEmail,
          phone: r.customerPhone,
        },
      });
      // sendReviewRequest already persists status + event.
      await bumpAttempt(r.id);
      results.push({ status: result.status });
    } catch (err) {
      // Never let one bad send abort the rest of the batch.
      const message = err instanceof Error ? err.message : String(err);
      await db
        .update(reviewRequestRecipients)
        .set({
          status: "failed",
          errorMessage: message.slice(0, 500),
          attemptCount: sql`${reviewRequestRecipients.attemptCount} + 1`,
        })
        .where(eq(reviewRequestRecipients.id, r.id));
      await recordRecipientEvent(campaign.orgId, campaignId, r.id, "failed", {
        channel,
        error: message.slice(0, 200),
      });
      results.push({ status: "failed" });
    }
  }

  const summary = summarizeBatch(results);

  if ((await countPending(campaignId)) === 0) {
    await markCompleted(campaignId);
  }

  return summary;
}

async function markRecipientSkipped(
  recipientId: string,
  error: string,
): Promise<void> {
  await db
    .update(reviewRequestRecipients)
    .set({
      status: "skipped",
      errorMessage: error,
      attemptCount: sql`${reviewRequestRecipients.attemptCount} + 1`,
    })
    .where(eq(reviewRequestRecipients.id, recipientId));
}

async function bumpAttempt(recipientId: string): Promise<void> {
  await db
    .update(reviewRequestRecipients)
    .set({ attemptCount: sql`${reviewRequestRecipients.attemptCount} + 1` })
    .where(eq(reviewRequestRecipients.id, recipientId));
}

async function recordRecipientEvent(
  orgId: string,
  campaignId: string,
  recipientId: string,
  status: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await db.insert(reviewRequestEvents).values({
    orgId,
    campaignId,
    recipientId,
    eventName: `request.${status}`,
    payload: { ...payload, source: "drip_scheduler" },
  });
}
