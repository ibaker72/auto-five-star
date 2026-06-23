import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  reviewRequestRecipients,
  reviewRequestCampaigns,
  reviewRequestEvents,
} from "@/lib/db/schema";

// Recipient ids are UUIDs. Validate the shape before touching the DB so a
// malformed link (e.g. a scanner hitting /r/<garbage>) returns the same
// graceful fallback redirect instead of raising an invalid-uuid DB error.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function appFallbackUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://www.autofivestar.com";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ recipientId: string }> },
) {
  const { recipientId } = await params;

  if (!UUID_RE.test(recipientId)) {
    return NextResponse.redirect(appFallbackUrl());
  }

  const row = await db
    .select({
      recipient: reviewRequestRecipients,
      campaign: reviewRequestCampaigns,
    })
    .from(reviewRequestRecipients)
    .innerJoin(
      reviewRequestCampaigns,
      eq(reviewRequestCampaigns.id, reviewRequestRecipients.campaignId),
    )
    .where(eq(reviewRequestRecipients.id, recipientId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!row || !row.campaign.googleReviewUrl) {
    return NextResponse.redirect(appFallbackUrl());
  }

  const now = new Date();

  await db
    .update(reviewRequestRecipients)
    .set({
      status: "clicked",
      clickedAt: now,
    })
    .where(eq(reviewRequestRecipients.id, recipientId));

  await db.insert(reviewRequestEvents).values({
    orgId: row.recipient.orgId,
    campaignId: row.recipient.campaignId,
    recipientId: row.recipient.id,
    eventName: "request.clicked",
    payload: {
      clicked_at: now.toISOString(),
      customer_name: row.recipient.customerName,
    },
  });

  return NextResponse.redirect(row.campaign.googleReviewUrl);
}
