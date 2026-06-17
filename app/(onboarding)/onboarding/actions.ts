"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireOrgContext } from "@/lib/auth/org";
import { db } from "@/lib/db/client";
import { organizations, users } from "@/lib/db/schema";
import { posthog } from "@/lib/posthog";
import { writeAudit } from "@/lib/audit";
import {
  isOnboardingStep,
  nextStep,
  type OnboardingStep,
} from "@/lib/onboarding/steps";
import {
  getIndustryPack,
  isIndustryPackId,
} from "@/lib/templates/industry-packs";
import {
  isResponseLength,
  isTonePreset,
  upsertBrandVoiceForOrg,
} from "@/lib/ai/brand-voice";

async function advanceStep(args: {
  orgId: string;
  current: OnboardingStep;
  markComplete?: boolean;
}): Promise<OnboardingStep> {
  const target = args.markComplete ? "done" : nextStep(args.current);
  await db
    .update(organizations)
    .set({
      onboardingStep: target,
      onboardingCompletedAt: target === "done" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, args.orgId));
  return target;
}

function redirectToStep(step: OnboardingStep): never {
  if (step === "done") redirect("/dashboard");
  redirect(`/onboarding?step=${step}`);
}

export async function saveBusinessStep(formData: FormData): Promise<void> {
  const ctx = await requireOrgContext();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length > 0) {
    await db
      .update(organizations)
      .set({ name, updatedAt: new Date() })
      .where(eq(organizations.id, ctx.org.id));
  }
  const next = await advanceStep({
    orgId: ctx.org.id,
    current: "business",
  });
  revalidatePath("/onboarding");
  redirectToStep(next);
}

export async function saveIndustryStep(formData: FormData): Promise<void> {
  const ctx = await requireOrgContext();
  const industry = String(formData.get("industry") ?? "");
  if (!isIndustryPackId(industry)) {
    redirect(
      `/onboarding?step=industry&error=${encodeURIComponent("Pick an industry to continue.")}`,
    );
  }
  await db
    .update(organizations)
    .set({ industry, updatedAt: new Date() })
    .where(eq(organizations.id, ctx.org.id));

  // Seed brand voice with the pack defaults if no voice has been customized.
  const pack = getIndustryPack(industry);
  if (pack) {
    await upsertBrandVoiceForOrg({
      orgId: ctx.org.id,
      userId: ctx.user.id,
      tonePreset: pack.defaultTonePreset,
      responseLength: pack.defaultResponseLength,
      emojiAllowed: pack.defaultEmojiAllowed,
      industryPack: pack.id,
    });
  }

  await writeAudit({
    orgId: ctx.org.id,
    actorUserId: ctx.user.id,
    action: "org.created",
    targetType: "organization",
    targetId: ctx.org.id,
    metadata: { kind: "industry_set", industry },
  });

  const next = await advanceStep({
    orgId: ctx.org.id,
    current: "industry",
  });
  revalidatePath("/onboarding");
  redirectToStep(next);
}

export async function saveNotificationsStep(
  formData: FormData,
): Promise<void> {
  const ctx = await requireOrgContext();
  const alertsEmailEnabled = formData.get("alerts_email_enabled") === "on";
  const alertsSmsEnabled = formData.get("alerts_sms_enabled") === "on";
  const phoneRaw = String(formData.get("notification_phone") ?? "").trim();
  const phone =
    phoneRaw === ""
      ? null
      : phoneRaw.replace(/[^\d+]/g, "") || null;

  await db
    .update(users)
    .set({
      alertsEmailEnabled,
      alertsSmsEnabled,
      notificationPhone: phone,
      updatedAt: new Date(),
    })
    .where(eq(users.id, ctx.user.id));

  const next = await advanceStep({
    orgId: ctx.org.id,
    current: "notifications",
  });
  revalidatePath("/onboarding");
  redirectToStep(next);
}

export async function saveVoiceStep(formData: FormData): Promise<void> {
  const ctx = await requireOrgContext();

  const tonePreset = String(formData.get("tone_preset") ?? "");
  const responseLength = String(formData.get("response_length") ?? "");
  const emojiAllowed = formData.get("emoji_allowed") === "on";
  const signatureRaw = String(formData.get("signature") ?? "").trim();
  const notesRaw = String(formData.get("custom_notes") ?? "").trim();

  await upsertBrandVoiceForOrg({
    orgId: ctx.org.id,
    userId: ctx.user.id,
    tonePreset: isTonePreset(tonePreset) ? tonePreset : null,
    responseLength: isResponseLength(responseLength) ? responseLength : null,
    emojiAllowed,
    voiceSignature: signatureRaw === "" ? null : signatureRaw,
    customNotes: notesRaw === "" ? null : notesRaw,
  });

  const next = await advanceStep({
    orgId: ctx.org.id,
    current: "voice",
    markComplete: true,
  });

  posthog.capture({
    distinctId: ctx.user.id,
    event: "onboarding_completed",
    properties: { org_id: ctx.org.id },
  });

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  redirectToStep(next);
}

export async function skipToStep(formData: FormData): Promise<void> {
  const ctx = await requireOrgContext();
  const target = String(formData.get("target") ?? "");
  if (!isOnboardingStep(target)) {
    redirect("/onboarding");
  }
  await db
    .update(organizations)
    .set({
      onboardingStep: target,
      onboardingCompletedAt: target === "done" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, ctx.org.id));
  revalidatePath("/onboarding");
  redirectToStep(target);
}
