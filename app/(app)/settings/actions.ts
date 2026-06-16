"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireOrgContext } from "@/lib/auth/org";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  // Keep only digits and leading + for E.164.
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
  redirect("/settings?saved=1");
}
