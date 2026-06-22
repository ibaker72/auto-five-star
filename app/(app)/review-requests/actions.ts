"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireOrgContext } from "@/lib/auth/org";
import { db } from "@/lib/db/client";
import {
  reviewRequestCampaigns,
  reviewRequestEvents,
  reviewRequestRecipients,
} from "@/lib/db/schema";
import {
  EntitlementError,
  requireEntitlement,
} from "@/lib/billing/entitlements";
import { validateTemplate } from "@/lib/review-requests/templates";
import { getOrgName, sendReviewRequest } from "@/lib/review-requests/send";
import { validateReviewUrl } from "@/lib/review-requests/qr";
import { buildSchedule, campaignDaySpan } from "@/lib/review-requests/schedule";
import { writeAudit } from "@/lib/audit";

const channelSchema = z.enum(["email", "sms", "both"]);

const sendSchema = z.object({
  customer_name: z.string().trim().min(1, "Customer name is required."),
  customer_email: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  customer_phone: z
    .string()
    .trim()
    .min(7)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  channel: channelSchema,
  location_id: z.string().uuid().optional().or(z.literal("")),
  message_template: z.string().trim().min(10, "Template is too short."),
  review_url: z.string().trim().min(1, "Review URL is required."),
});

export type SendActionState = {
  ok: boolean;
  error?: string;
  results?: Array<{ channel: "email" | "sms"; status: string; error?: string }>;
};

export async function sendManualReviewRequest(
  _prev: SendActionState,
  formData: FormData,
): Promise<SendActionState> {
  const ctx = await requireOrgContext();

  const parsed = sendSchema.safeParse({
    customer_name: formData.get("customer_name"),
    customer_email: formData.get("customer_email") ?? "",
    customer_phone: formData.get("customer_phone") ?? "",
    channel: formData.get("channel") ?? "email",
    location_id: formData.get("location_id") ?? "",
    message_template: formData.get("message_template") ?? "",
    review_url: formData.get("review_url") ?? "",
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Please check the form fields.",
    };
  }
  const data = parsed.data;

  const validation = validateTemplate(data.message_template);
  if (!validation.ok) {
    return {
      ok: false,
      error:
        validation.missingRequired.length > 0
          ? `Template is missing required variables: ${validation.missingRequired.join(", ")}.`
          : `Unknown template variables: ${validation.unknownVariables.join(", ")}.`,
    };
  }

  let reviewUrl: string;
  try {
    reviewUrl = validateReviewUrl(data.review_url);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid URL.",
    };
  }

  const wantsSms = data.channel === "sms" || data.channel === "both";
  if (wantsSms) {
    try {
      await requireEntitlement(ctx.org.id, "review_requests.sms");
    } catch (err) {
      if (err instanceof EntitlementError) {
        return { ok: false, error: err.message };
      }
      throw err;
    }
  }

  const wantsEmail = data.channel === "email" || data.channel === "both";

  if (wantsEmail && !data.customer_email) {
    return { ok: false, error: "Email channel requires an email address." };
  }
  if (wantsSms && !data.customer_phone) {
    return { ok: false, error: "SMS channel requires a phone number." };
  }

  const businessName = await getOrgName(ctx.org.id);

  const [campaign] = await db
    .insert(reviewRequestCampaigns)
    .values({
      orgId: ctx.org.id,
      locationId: data.location_id ? data.location_id : null,
      name: `Manual · ${data.customer_name}`,
      channel: data.channel,
      status: "sending",
      messageTemplate: data.message_template,
      googleReviewUrl: reviewUrl,
      createdByUserId: ctx.user.id,
    })
    .returning();
  if (!campaign) {
    return { ok: false, error: "Could not create campaign." };
  }

  await db.insert(reviewRequestEvents).values({
    orgId: ctx.org.id,
    campaignId: campaign.id,
    eventName: "campaign.created",
    payload: { kind: "manual", channel: data.channel },
  });

  const channelsToSend: Array<"email" | "sms"> = [];
  if (wantsEmail) channelsToSend.push("email");
  if (wantsSms) channelsToSend.push("sms");

  const results: Array<{
    channel: "email" | "sms";
    status: string;
    error?: string;
  }> = [];

  for (const ch of channelsToSend) {
    const [recipient] = await db
      .insert(reviewRequestRecipients)
      .values({
        campaignId: campaign.id,
        orgId: ctx.org.id,
        customerName: data.customer_name,
        customerEmail: data.customer_email ?? null,
        customerPhone: data.customer_phone ?? null,
        status: "pending",
      })
      .returning();
    if (!recipient) continue;

    const result = await sendReviewRequest({
      recipientId: recipient.id,
      orgId: ctx.org.id,
      campaignId: campaign.id,
      channel: ch,
      messageTemplate: data.message_template,
      businessName,
      reviewUrl,
      customer: {
        name: data.customer_name,
        email: data.customer_email ?? null,
        phone: data.customer_phone ?? null,
      },
    });
    results.push({
      channel: ch,
      status: result.status,
      error: result.error,
    });
  }

  const anySent = results.some((r) => r.status === "sent");
  await db
    .update(reviewRequestCampaigns)
    .set({
      status: anySent ? "completed" : "failed",
      updatedAt: new Date(),
    })
    .where(eq(reviewRequestCampaigns.id, campaign.id));

  await writeAudit({
    orgId: ctx.org.id,
    actorUserId: ctx.user.id,
    action: "review_request.sent",
    targetType: "campaign",
    targetId: campaign.id,
    metadata: { kind: "manual", channel: data.channel, results },
  });

  revalidatePath("/review-requests");
  return { ok: true, results };
}

const csvImportSchema = z.object({
  channel: channelSchema,
  location_id: z.string().uuid().optional().or(z.literal("")),
  message_template: z.string().trim().min(10),
  review_url: z.string().trim().min(1),
  campaign_name: z.string().trim().min(1).max(120),
  rows_json: z.string().min(2),
  confirm: z.literal("yes"),
  // Scheduling (drip campaigns). Defaults preserve immediate-send behavior.
  send_mode: z.enum(["immediate", "scheduled"]).default("immediate"),
  daily_limit: z.coerce.number().int().positive().max(1000).optional(),
  start_at: z.string().trim().optional().or(z.literal("")),
});

type CsvRow = {
  name: string;
  email: string | null;
  phone: string | null;
};

export async function importCsvCampaign(
  _prev: SendActionState,
  formData: FormData,
): Promise<SendActionState> {
  const ctx = await requireOrgContext();

  try {
    await requireEntitlement(ctx.org.id, "review_requests.csv");
  } catch (err) {
    if (err instanceof EntitlementError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  const parsed = csvImportSchema.safeParse({
    channel: formData.get("channel") ?? "email",
    location_id: formData.get("location_id") ?? "",
    message_template: formData.get("message_template") ?? "",
    review_url: formData.get("review_url") ?? "",
    campaign_name: formData.get("campaign_name") ?? "",
    rows_json: formData.get("rows_json") ?? "[]",
    confirm: formData.get("confirm") ?? "no",
    send_mode: formData.get("send_mode") ?? "immediate",
    daily_limit: formData.get("daily_limit") ?? undefined,
    start_at: formData.get("start_at") ?? "",
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Please check the form.",
    };
  }
  const data = parsed.data;

  let reviewUrl: string;
  try {
    reviewUrl = validateReviewUrl(data.review_url);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid URL.",
    };
  }

  const validation = validateTemplate(data.message_template);
  if (!validation.ok) {
    return {
      ok: false,
      error:
        validation.missingRequired.length > 0
          ? `Template is missing required variables: ${validation.missingRequired.join(", ")}.`
          : `Unknown template variables: ${validation.unknownVariables.join(", ")}.`,
    };
  }

  let rows: CsvRow[] = [];
  try {
    const raw = JSON.parse(data.rows_json) as unknown;
    if (!Array.isArray(raw)) throw new Error("not an array");
    rows = raw.slice(0, 500).map((r) => {
      const rec = r as Record<string, unknown>;
      const name = String(rec.name ?? "").trim();
      const email = String(rec.email ?? "").trim() || null;
      const phone = String(rec.phone ?? "").trim() || null;
      return { name, email, phone };
    });
  } catch {
    return { ok: false, error: "Could not parse the CSV preview." };
  }

  rows = rows.filter((r) => r.name && (r.email || r.phone));
  if (rows.length === 0) {
    return {
      ok: false,
      error: "No valid rows. Each row needs a name and an email or phone.",
    };
  }

  const wantsSms = data.channel === "sms" || data.channel === "both";
  if (wantsSms) {
    try {
      await requireEntitlement(ctx.org.id, "review_requests.sms");
    } catch (err) {
      if (err instanceof EntitlementError) {
        return { ok: false, error: err.message };
      }
      throw err;
    }
  }

  const businessName = await getOrgName(ctx.org.id);

  const channelsToSend: Array<"email" | "sms"> = [];
  if (data.channel === "email" || data.channel === "both") channelsToSend.push("email");
  if (data.channel === "sms" || data.channel === "both") channelsToSend.push("sms");

  // -------------------------------------------------------------------------
  // Scheduled (drip) mode: stage recipients with a per-row send time and hand
  // off to the cron. Nothing is sent inline here.
  // -------------------------------------------------------------------------
  if (data.send_mode === "scheduled") {
    const dailyLimit = data.daily_limit ?? 25;

    // Start now (or at the requested time, never in the past).
    const now = new Date();
    let startAt = now;
    if (data.start_at) {
      const parsedDate = new Date(data.start_at);
      if (!Number.isNaN(parsedDate.getTime()) && parsedDate.getTime() > now.getTime()) {
        startAt = parsedDate;
      }
    }

    // Flatten (row × channel) into the ordered send list, then schedule it.
    const pairs = rows.flatMap((row) =>
      channelsToSend.map((ch) => ({ row, channel: ch })),
    );
    const schedule = buildSchedule(pairs.length, dailyLimit, startAt);
    const daySpan = campaignDaySpan(pairs.length, dailyLimit);

    const [campaign] = await db
      .insert(reviewRequestCampaigns)
      .values({
        orgId: ctx.org.id,
        locationId: data.location_id ? data.location_id : null,
        name: data.campaign_name,
        channel: data.channel,
        status: "scheduled",
        sendMode: "scheduled",
        dailyLimit,
        scheduledStartAt: startAt,
        messageTemplate: data.message_template,
        googleReviewUrl: reviewUrl,
        createdByUserId: ctx.user.id,
      })
      .returning();
    if (!campaign) {
      return { ok: false, error: "Could not create campaign." };
    }

    if (pairs.length > 0) {
      await db.insert(reviewRequestRecipients).values(
        pairs.map((p, i) => ({
          campaignId: campaign.id,
          orgId: ctx.org.id,
          customerName: p.row.name,
          customerEmail: p.row.email,
          customerPhone: p.row.phone,
          channel: p.channel,
          status: "pending" as const,
          scheduledAt: schedule[i] ?? startAt,
        })),
      );
    }

    await db.insert(reviewRequestEvents).values({
      orgId: ctx.org.id,
      campaignId: campaign.id,
      eventName: "campaign.created",
      payload: {
        kind: "csv_import",
        mode: "scheduled",
        rows: rows.length,
        recipients: pairs.length,
        channel: data.channel,
        dailyLimit,
        daySpan,
        startAt: startAt.toISOString(),
      },
    });

    await writeAudit({
      orgId: ctx.org.id,
      actorUserId: ctx.user.id,
      action: "review_request.scheduled",
      targetType: "campaign",
      targetId: campaign.id,
      metadata: {
        kind: "csv_import",
        rows: rows.length,
        recipients: pairs.length,
        channel: data.channel,
        dailyLimit,
        daySpan,
        startAt: startAt.toISOString(),
      },
    });

    revalidatePath("/review-requests");
    return {
      ok: true,
      results: [
        {
          channel: "email",
          status: `scheduled ${pairs.length} send${pairs.length === 1 ? "" : "s"} over ${daySpan} day${daySpan === 1 ? "" : "s"} (${dailyLimit}/day)`,
        },
      ],
    };
  }

  // -------------------------------------------------------------------------
  // Immediate mode (unchanged): send inline as the campaign is created.
  // -------------------------------------------------------------------------
  const [campaign] = await db
    .insert(reviewRequestCampaigns)
    .values({
      orgId: ctx.org.id,
      locationId: data.location_id ? data.location_id : null,
      name: data.campaign_name,
      channel: data.channel,
      status: "sending",
      messageTemplate: data.message_template,
      googleReviewUrl: reviewUrl,
      createdByUserId: ctx.user.id,
    })
    .returning();
  if (!campaign) {
    return { ok: false, error: "Could not create campaign." };
  }

  await db.insert(reviewRequestEvents).values({
    orgId: ctx.org.id,
    campaignId: campaign.id,
    eventName: "campaign.created",
    payload: { kind: "csv_import", rows: rows.length, channel: data.channel },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    for (const ch of channelsToSend) {
      const [recipient] = await db
        .insert(reviewRequestRecipients)
        .values({
          campaignId: campaign.id,
          orgId: ctx.org.id,
          customerName: row.name,
          customerEmail: row.email,
          customerPhone: row.phone,
          channel: ch,
          status: "pending",
        })
        .returning();
      if (!recipient) continue;

      const result = await sendReviewRequest({
        recipientId: recipient.id,
        orgId: ctx.org.id,
        campaignId: campaign.id,
        channel: ch,
        messageTemplate: data.message_template,
        businessName,
        reviewUrl,
        customer: { name: row.name, email: row.email, phone: row.phone },
      });
      if (result.status === "sent") sent++;
      else if (result.status === "skipped") skipped++;
      else failed++;
    }
  }

  await db
    .update(reviewRequestCampaigns)
    .set({
      status: sent > 0 ? "completed" : failed > 0 ? "failed" : "completed",
      updatedAt: new Date(),
    })
    .where(eq(reviewRequestCampaigns.id, campaign.id));

  await writeAudit({
    orgId: ctx.org.id,
    actorUserId: ctx.user.id,
    action: "review_request.sent",
    targetType: "campaign",
    targetId: campaign.id,
    metadata: {
      kind: "csv_import",
      rows: rows.length,
      sent,
      skipped,
      failed,
      channel: data.channel,
    },
  });

  revalidatePath("/review-requests");
  return {
    ok: true,
    results: [
      {
        channel: "email",
        status: `sent=${sent}, skipped=${skipped}, failed=${failed}`,
      },
    ],
  };
}
