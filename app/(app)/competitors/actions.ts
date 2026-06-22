"use server";

import { eq, and, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import {
  competitorSnapshots,
  locations,
} from "@/lib/db/schema";
import { requireOrgContext } from "@/lib/auth/org";
import { requireEntitlement } from "@/lib/billing/entitlements";
import { writeAudit } from "@/lib/audit";

export async function addCompetitorSnapshot(formData: FormData) {
  const ctx = await requireOrgContext();
  await requireEntitlement(ctx.org.id, "yelp.read");

  const locationId = formData.get("location_id") as string;
  const competitorName = (formData.get("competitor_name") as string).trim();
  const rating = parseFloat(formData.get("rating") as string);
  const reviewCount = parseInt(formData.get("review_count") as string, 10);
  const responseRate = parseInt(formData.get("response_rate") as string, 10);
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (
    !locationId ||
    !competitorName ||
    isNaN(rating) ||
    isNaN(reviewCount)
  ) {
    redirect("/competitors?error=invalid");
  }

  const loc = await db
    .select({ id: locations.id })
    .from(locations)
    .where(
      and(eq(locations.id, locationId), eq(locations.orgId, ctx.org.id)),
    )
    .limit(1);

  if (!loc[0]) {
    redirect("/competitors?error=invalid_location");
  }

  await db.insert(competitorSnapshots).values({
    orgId: ctx.org.id,
    locationId,
    payload: {
      competitor_name: competitorName,
      rating,
      review_count: reviewCount,
      response_rate: isNaN(responseRate) ? null : responseRate,
      notes,
      captured_by: ctx.user.id,
    },
  });

  await writeAudit({
    orgId: ctx.org.id,
    actorUserId: ctx.user.id,
    action: "competitor.snapshot_added",
    targetType: "location",
    targetId: locationId,
    metadata: {
      competitor_name: competitorName,
      rating,
      review_count: reviewCount,
    },
  });

  redirect("/competitors?saved=1");
}

export async function getCompetitorSnapshots(orgId: string) {
  return db
    .select()
    .from(competitorSnapshots)
    .where(eq(competitorSnapshots.orgId, orgId))
    .orderBy(desc(competitorSnapshots.capturedAt))
    .limit(50);
}
