import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  locations as locationsTable,
  notifications as notificationsTable,
  organizations,
  reviews as reviewsTable,
} from "@/lib/db/schema";
import { canUseSmsAlerts } from "@/lib/billing/entitlements";
import { sendNewReviewAlertEmail } from "@/lib/integrations/resend";
import { sendNegativeReviewSmsAlert } from "@/lib/integrations/twilio";
import { getOrgAlertRecipients } from "./recipients";

export type AlertChannel = "email" | "sms" | "in_app";

export type AlertEventType =
  | "review.alert.urgent" // 1-2 stars: send immediately on email + sms
  | "review.alert.daily_digest_pending" // 3 stars
  | "review.alert.weekly_digest_pending"; // 4-5 stars

/**
 * Classify a review by rating into the right alert event type.
 */
export function classifyReviewAlert(rating: number): AlertEventType {
  if (rating <= 2) return "review.alert.urgent";
  if (rating === 3) return "review.alert.daily_digest_pending";
  return "review.alert.weekly_digest_pending";
}

export type ProcessReviewAlertInput = {
  orgId: string;
  reviewId: string;
};

export type ProcessReviewAlertResult = {
  reviewId: string;
  eventType: AlertEventType;
  emailsSent: number;
  emailsFailed: number;
  smsSent: number;
  smsSkipped: number;
  smsFailed: number;
};

/**
 * Send alerts (or queue digests) for one review. Idempotent at the
 * notifications-row level: the caller should only invoke this for reviews
 * that are genuinely new (the poller filters by xmax=0).
 */
export async function processReviewAlert(
  input: ProcessReviewAlertInput,
): Promise<ProcessReviewAlertResult> {
  const ctx = await loadReviewContext(input);
  const eventType = classifyReviewAlert(ctx.review.rating);
  const recipients = await getOrgAlertRecipients(ctx.org.id);

  const result: ProcessReviewAlertResult = {
    reviewId: ctx.review.id,
    eventType,
    emailsSent: 0,
    emailsFailed: 0,
    smsSent: 0,
    smsSkipped: 0,
    smsFailed: 0,
  };

  // Email: queue immediately for urgent reviews; queue digest-pending rows
  // for 3-5 star reviews so a future digest job can pick them up.
  for (const r of recipients) {
    if (eventType === "review.alert.urgent") {
      if (!r.alertsEmailEnabled) {
        await writeNotificationRow({
          orgId: ctx.org.id,
          userId: r.userId,
          channel: "email",
          event: eventType,
          payload: alertPayload(ctx),
          status: "skipped",
          errorMessage: "alerts_email_disabled",
        });
        continue;
      }
      const queued = await writeNotificationRow({
        orgId: ctx.org.id,
        userId: r.userId,
        channel: "email",
        event: eventType,
        payload: alertPayload(ctx),
        status: "queued",
      });
      const res = await sendNewReviewAlertEmail(r.email, {
        recipientName: r.fullName,
        businessName: ctx.org.name,
        locationName: ctx.location.name,
        rating: ctx.review.rating,
        reviewerName: ctx.review.reviewerName ?? "A customer",
        excerpt: truncate(ctx.review.body ?? "", 320),
        reviewUrl: buildReviewUrl(ctx.review.id),
      });
      await updateNotificationStatus({
        id: queued.id,
        status: res.ok ? "sent" : "failed",
        sentAt: res.ok ? new Date() : null,
        errorMessage: res.ok ? null : (res.error ?? "send_failed"),
        fixture: res.fixture,
      });
      if (res.ok) result.emailsSent += 1;
      else result.emailsFailed += 1;
    } else {
      // Non-urgent: queue a digest-pending row, do not send now.
      await writeNotificationRow({
        orgId: ctx.org.id,
        userId: r.userId,
        channel: "email",
        event: eventType,
        payload: alertPayload(ctx),
        status: "queued",
      });
    }
  }

  // SMS: only for urgent 1-2 star reviews + Growth/Pro entitlement +
  // recipient opted in + phone number on file.
  if (eventType === "review.alert.urgent") {
    const sms = await canUseSmsAlerts(ctx.org.id);
    if (!sms.ok) {
      for (const r of recipients) {
        await writeNotificationRow({
          orgId: ctx.org.id,
          userId: r.userId,
          channel: "sms",
          event: eventType,
          payload: alertPayload(ctx),
          status: "skipped",
          errorMessage: "plan_does_not_allow_sms",
        });
        result.smsSkipped += 1;
      }
    } else {
      for (const r of recipients) {
        if (!r.alertsSmsEnabled) {
          await writeNotificationRow({
            orgId: ctx.org.id,
            userId: r.userId,
            channel: "sms",
            event: eventType,
            payload: alertPayload(ctx),
            status: "skipped",
            errorMessage: "alerts_sms_disabled",
          });
          result.smsSkipped += 1;
          continue;
        }
        if (!r.notificationPhone) {
          // TODO: add a UI prompt for owners to set a phone number on /settings.
          await writeNotificationRow({
            orgId: ctx.org.id,
            userId: r.userId,
            channel: "sms",
            event: eventType,
            payload: alertPayload(ctx),
            status: "skipped",
            errorMessage: "missing_phone_number",
          });
          result.smsSkipped += 1;
          continue;
        }
        const queued = await writeNotificationRow({
          orgId: ctx.org.id,
          userId: r.userId,
          channel: "sms",
          event: eventType,
          payload: alertPayload(ctx),
          status: "queued",
        });
        const res = await sendNegativeReviewSmsAlert(r.notificationPhone, {
          locationName: ctx.location.name,
          rating: ctx.review.rating as 1 | 2,
          reviewUrl: buildReviewUrl(ctx.review.id),
        });
        const wasSkipped = res.error === "sms_disabled";
        await updateNotificationStatus({
          id: queued.id,
          status: res.ok ? "sent" : wasSkipped ? "skipped" : "failed",
          sentAt: res.ok ? new Date() : null,
          errorMessage: res.ok
            ? null
            : wasSkipped
              ? "sms_disabled"
              : (res.error ?? "send_failed"),
          fixture: res.fixture,
        });
        if (res.ok) result.smsSent += 1;
        else if (wasSkipped) result.smsSkipped += 1;
        else result.smsFailed += 1;
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
async function loadReviewContext(input: ProcessReviewAlertInput) {
  const row = await db
    .select({
      review: reviewsTable,
      location: locationsTable,
      org: organizations,
    })
    .from(reviewsTable)
    .innerJoin(locationsTable, eq(locationsTable.id, reviewsTable.locationId))
    .innerJoin(organizations, eq(organizations.id, reviewsTable.orgId))
    .where(
      and(
        eq(reviewsTable.id, input.reviewId),
        eq(reviewsTable.orgId, input.orgId),
      ),
    )
    .limit(1);
  const got = row[0];
  if (!got) throw new Error(`Review ${input.reviewId} not found in org ${input.orgId}`);
  return got;
}

function alertPayload(ctx: Awaited<ReturnType<typeof loadReviewContext>>): Record<string, unknown> {
  return {
    review_id: ctx.review.id,
    rating: ctx.review.rating,
    source: ctx.review.source,
    location_id: ctx.location.id,
    location_name: ctx.location.name,
  };
}

function buildReviewUrl(reviewId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/reviews/${reviewId}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trimEnd()}…`;
}

async function writeNotificationRow(params: {
  orgId: string;
  userId: string;
  channel: AlertChannel;
  event: AlertEventType;
  payload: Record<string, unknown>;
  status: "queued" | "sent" | "failed" | "skipped";
  errorMessage?: string;
}) {
  const inserted = await db
    .insert(notificationsTable)
    .values({
      orgId: params.orgId,
      userId: params.userId,
      channel: params.channel,
      event: params.event,
      payload: params.payload,
      status: params.status,
      errorMessage: params.errorMessage,
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error("Failed to write notification row");
  return row;
}

async function updateNotificationStatus(args: {
  id: string;
  status: "sent" | "failed" | "skipped";
  sentAt: Date | null;
  errorMessage: string | null;
  fixture: boolean;
}) {
  await db
    .update(notificationsTable)
    .set({
      status: args.status,
      sentAt: args.sentAt,
      errorMessage: args.errorMessage,
      payload: args.fixture
        ? sql`${notificationsTable.payload} || '{"fixture": true}'::jsonb`
        : undefined,
      updatedAt: new Date(),
    })
    .where(eq(notificationsTable.id, args.id));
}
