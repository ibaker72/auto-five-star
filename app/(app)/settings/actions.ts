"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireOrgContext } from "@/lib/auth/org";
import { db } from "@/lib/db/client";
import { organizations, users } from "@/lib/db/schema";
import {
  isResponseLength,
  isTonePreset,
  upsertBrandVoiceForOrg,
} from "@/lib/ai/brand-voice";
import {
  getIndustryPack,
  isIndustryPackId,
} from "@/lib/templates/industry-packs";
import { writeAudit } from "@/lib/audit";

function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const cleaned = trimmed.replace(/[^\d+]/g, "");
  return cleaned.length === 0 ? null : cleaned;
}

export async function saveNotificationPrefs(
  formData: FormData,
): Promise<void> {
  const ctx = await requireOrgContext();

  const alertsEmailEnabled = formData.get("alerts_email_enabled") === "on";
  const alertsSmsEnabled = formData.get("alerts_sms_enabled") === "on";
  const notificationPhone = normalizePhone(
    String(formData.get("notification_phone") ?? ""),
  );

  await db
    .update(users)
    .set({
      alertsEmailEnabled,
      alertsSmsEnabled,
      notificationPhone,
      updatedAt: new Date(),
    })
    .where(eq(users.id, ctx.user.id));

  revalidatePath("/settings");
  redirect("/settings?saved=notifications");
}

export async function saveIndustry(formData: FormData): Promise<void> {
  const ctx = await requireOrgContext();
  const industry = String(formData.get("industry") ?? "");
  if (!isIndustryPackId(industry)) {
    redirect("/settings?saved=0");
  }

  await db
    .update(organizations)
    .set({ industry, updatedAt: new Date() })
    .where(eq(organizations.id, ctx.org.id));

  // Refresh the brand voice's industry pack pointer; don't clobber custom
  // tone/length settings if the owner already chose them.
  const pack = getIndustryPack(industry);
  if (pack) {
    await upsertBrandVoiceForOrg({
      orgId: ctx.org.id,
      userId: ctx.user.id,
      industryPack: pack.id,
    });
  }

  await writeAudit({
    orgId: ctx.org.id,
    actorUserId: ctx.user.id,
    action: "org.created",
    targetType: "organization",
    targetId: ctx.org.id,
    metadata: { kind: "industry_updated", industry },
  });

  revalidatePath("/settings");
  revalidatePath("/onboarding");
  redirect("/settings?saved=industry");
}

export async function saveBrandVoice(formData: FormData): Promise<void> {
  const ctx = await requireOrgContext();

  const tonePresetRaw = String(formData.get("tone_preset") ?? "");
  const responseLengthRaw = String(formData.get("response_length") ?? "");
  const emojiAllowed = formData.get("emoji_allowed") === "on";
  const signature = String(formData.get("signature") ?? "").trim();
  const notes = String(formData.get("custom_notes") ?? "").trim();

  await upsertBrandVoiceForOrg({
    orgId: ctx.org.id,
    userId: ctx.user.id,
    tonePreset: isTonePreset(tonePresetRaw) ? tonePresetRaw : null,
    responseLength: isResponseLength(responseLengthRaw)
      ? responseLengthRaw
      : null,
    emojiAllowed,
    voiceSignature: signature === "" ? null : signature,
    customNotes: notes === "" ? null : notes,
  });

  await writeAudit({
    orgId: ctx.org.id,
    actorUserId: ctx.user.id,
    action: "draft.edited",
    targetType: "brand_voice",
    metadata: {
      tone_preset: tonePresetRaw || null,
      response_length: responseLengthRaw || null,
      emoji_allowed: emojiAllowed,
    },
  });

  revalidatePath("/settings");
  redirect("/settings?saved=voice");
}
