"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { requireOrgContext } from "@/lib/auth/org";
import { requireEntitlement } from "@/lib/billing/entitlements";
import {
  connectGoogleLocation,
  pullGoogleReviews,
} from "@/lib/integrations/google";
import { disconnectGoogle } from "@/lib/integrations/google-tokens";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db/client";
import { locations as locationsTable } from "@/lib/db/schema";

function locationsRedirect(params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`/locations${qs ? `?${qs}` : ""}`);
}

export async function connectLocationAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireOrgContext();
  const accountName = String(formData.get("account") ?? "");
  const locationName = String(formData.get("location") ?? "");
  if (!accountName.startsWith("accounts/") || !locationName.startsWith("locations/")) {
    locationsRedirect({
      google: "error",
      message: "Pick an account and a location first.",
    });
  }

  try {
    await requireEntitlement(ctx.org.id, "locations.connect");
  } catch (err) {
    locationsRedirect({
      google: "error",
      message:
        err instanceof Error
          ? err.message
          : "This plan does not allow more locations.",
    });
  }

  try {
    await connectGoogleLocation({
      orgId: ctx.org.id,
      userId: ctx.user.id,
      accountName,
      locationName,
    });
  } catch (err) {
    console.error("[locations/connect] failed", err);
    locationsRedirect({
      google: "error",
      message:
        err instanceof Error ? err.message : "Could not connect location.",
    });
  }

  revalidatePath("/locations");
  revalidatePath("/dashboard");
  locationsRedirect({ google: "location_connected" });
}

export async function pullReviewsAction(formData: FormData): Promise<void> {
  const ctx = await requireOrgContext();
  const locationId = String(formData.get("location_id") ?? "");
  if (!locationId) {
    locationsRedirect({ google: "error", message: "Missing location." });
  }

  try {
    const result = await pullGoogleReviews(ctx.org.id, locationId);
    await writeAudit({
      orgId: ctx.org.id,
      actorUserId: ctx.user.id,
      action: "reviews.pulled",
      targetType: "location",
      targetId: locationId,
      metadata: {
        manual: true,
        fetched: result.fetched,
        inserted: result.inserted,
        updated: result.updated,
      },
    });
  } catch (err) {
    console.error("[locations/pull] failed", err);
    locationsRedirect({
      google: "error",
      message:
        err instanceof Error ? err.message : "Could not pull reviews.",
    });
  }

  revalidatePath("/locations");
  revalidatePath("/dashboard");
  revalidatePath("/inbox");
  locationsRedirect({ google: "reviews_pulled" });
}

export async function disconnectGoogleAction(
  _formData: FormData,
): Promise<void> {
  const user = await getCurrentUser();
  const ctx = await requireOrgContext();
  await disconnectGoogle(ctx.org.id);
  await writeAudit({
    orgId: ctx.org.id,
    actorUserId: user?.id ?? null,
    action: "integration.disconnected",
    targetType: "integration",
    targetId: "google",
  });
  revalidatePath("/locations");
  locationsRedirect({ google: "disconnected" });
}

export async function removeLocationAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireOrgContext();
  const locationId = String(formData.get("location_id") ?? "");
  if (!locationId) {
    locationsRedirect({ google: "error", message: "Missing location." });
  }
  await db
    .delete(locationsTable)
    .where(
      and(
        eq(locationsTable.id, locationId),
        eq(locationsTable.orgId, ctx.org.id),
      ),
    );
  await writeAudit({
    orgId: ctx.org.id,
    actorUserId: ctx.user.id,
    action: "location.disconnected",
    targetType: "location",
    targetId: locationId,
  });
  revalidatePath("/locations");
  revalidatePath("/dashboard");
  locationsRedirect({ google: "location_removed" });
}
