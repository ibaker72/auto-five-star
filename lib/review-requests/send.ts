import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  organizations,
  reviewRequestEvents,
  reviewRequestRecipients,
  type ReviewRequestRecipient,
} from "@/lib/db/schema";
import { sendEmail, EmailConfigError } from "@/lib/integrations/resend";
import { sendSms, SmsConfigError } from "@/lib/integrations/twilio";
import { renderTemplate } from "./templates";

const IS_PROD = process.env.NODE_ENV === "production";
const EMAIL_LIVE = process.env.EMAIL_LIVE === "true";
const SMS_LIVE = process.env.SMS_LIVE === "true";

export type SendChannel = "email" | "sms";

export type SendReviewRequestParams = {
  recipientId: string;
  orgId: string;
  campaignId: string;
  channel: SendChannel;
  messageTemplate: string;
  businessName: string;
  reviewUrl: string;
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
  };
};

export type SendReviewRequestResult = {
  ok: boolean;
  status: "sent" | "skipped" | "failed";
  fixture: boolean;
  providerId: string | null;
  error?: string;
};

/**
 * Send a single review request. Respects EMAIL_LIVE / SMS_LIVE patterns
 * already used by review alerts:
 *
 * - Dev + LIVE=false → logs a fixture and records a "sent" row.
 * - Prod + LIVE=false (email) → throws like the alert path.
 * - Prod + LIVE=false (sms) → records a "skipped" row (A2P-pending pattern).
 * - LIVE=true → real send via Resend/Twilio.
 */
export async function sendReviewRequest(
  params: SendReviewRequestParams,
): Promise<SendReviewRequestResult> {
  const { channel, customer } = params;

  if (channel === "email" && !customer.email) {
    return persistAndReturn(params, {
      ok: false,
      status: "skipped",
      fixture: false,
      providerId: null,
      error: "missing_email",
    });
  }
  if (channel === "sms" && !customer.phone) {
    return persistAndReturn(params, {
      ok: false,
      status: "skipped",
      fixture: false,
      providerId: null,
      error: "missing_phone",
    });
  }

  const trackedReviewUrl = buildTrackedReviewUrl(params.recipientId);

  const body = renderTemplate(params.messageTemplate, {
    customerName: customer.name,
    businessName: params.businessName,
    reviewUrl: trackedReviewUrl,
  });

  if (channel === "email" && customer.email) {
    try {
      const result = await sendEmail({
        to: customer.email,
        subject: `A quick favor from ${params.businessName}`,
        html: emailHtml(body, params.businessName),
        text: body,
      });
      return persistAndReturn(params, {
        ok: result.ok,
        status: result.ok ? "sent" : "failed",
        fixture: result.fixture,
        providerId: result.providerId,
        error: result.error,
      });
    } catch (err) {
      if (err instanceof EmailConfigError) {
        // Production refuses to fixture-send. Mark skipped so the UI surfaces it.
        return persistAndReturn(params, {
          ok: false,
          status: "skipped",
          fixture: false,
          providerId: null,
          error: "email_disabled",
        });
      }
      throw err;
    }
  }

  if (channel === "sms" && customer.phone) {
    try {
      const result = await sendSms({ to: customer.phone, body });
      if (!result.ok && result.error === "sms_disabled") {
        return persistAndReturn(params, {
          ok: false,
          status: "skipped",
          fixture: false,
          providerId: null,
          error: "sms_disabled",
        });
      }
      return persistAndReturn(params, {
        ok: result.ok,
        status: result.ok ? "sent" : "failed",
        fixture: result.fixture,
        providerId: result.providerId,
        error: result.error,
      });
    } catch (err) {
      if (err instanceof SmsConfigError) {
        return persistAndReturn(params, {
          ok: false,
          status: "skipped",
          fixture: false,
          providerId: null,
          error: "sms_disabled",
        });
      }
      throw err;
    }
  }

  return persistAndReturn(params, {
    ok: false,
    status: "skipped",
    fixture: false,
    providerId: null,
    error: "no_channel_available",
  });
}

async function persistAndReturn(
  params: SendReviewRequestParams,
  result: SendReviewRequestResult,
): Promise<SendReviewRequestResult> {
  const updates: Partial<ReviewRequestRecipient> = {
    status: result.status,
    sentAt: result.status === "sent" ? new Date() : null,
    errorMessage: result.error ?? null,
  };

  await db
    .update(reviewRequestRecipients)
    .set(updates)
    .where(eq(reviewRequestRecipients.id, params.recipientId));

  await db.insert(reviewRequestEvents).values({
    orgId: params.orgId,
    campaignId: params.campaignId,
    recipientId: params.recipientId,
    eventName: `request.${result.status}`,
    payload: {
      channel: params.channel,
      fixture: result.fixture,
      providerId: result.providerId,
      error: result.error ?? null,
    },
  });

  return result;
}

export async function getOrgName(orgId: string): Promise<string> {
  const rows = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return rows[0]?.name ?? "your business";
}

export function describeSendEnvironment(): {
  emailLive: boolean;
  smsLive: boolean;
  isProd: boolean;
} {
  return { emailLive: EMAIL_LIVE, smsLive: SMS_LIVE, isProd: IS_PROD };
}

function buildTrackedReviewUrl(recipientId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/r/${recipientId}`;
}

function emailHtml(body: string, businessName: string): string {
  const escapedBody = escapeHtml(body).replace(/\n/g, "<br>");
  const safeBusiness = escapeHtml(businessName);
  return `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
      <p style="font-size:14px; color:#666; margin: 0 0 8px;">AutoFiveStar · sent on behalf of ${safeBusiness}</p>
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:24px;">
        <p style="margin:0; font-size:16px; line-height:1.6;">${escapedBody}</p>
      </div>
      <p style="color:#94a3b8; font-size:12px; margin-top:16px;">
        ${safeBusiness} sent this review request. If you'd rather not get
        follow-ups, just reply and let them know.
      </p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
