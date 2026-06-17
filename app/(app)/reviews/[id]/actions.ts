"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { requireOrgContext } from "@/lib/auth/org";
import { generateDraftsForReview } from "@/lib/ai/generate";
import {
  NotApprovedError,
  PostingRateLimitedError,
  postResponseToGoogle,
  UnsupportedSourceError,
} from "@/lib/ai/post-response";
import { db } from "@/lib/db/client";
import {
  responseDrafts,
  reviewResponses,
  reviews,
} from "@/lib/db/schema";
import { writeAudit } from "@/lib/audit";
import { EntitlementError } from "@/lib/billing/entitlements";
import { posthog } from "@/lib/posthog";

type ReviewActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

function reviewPath(reviewId: string, params?: Record<string, string>): string {
  const qs = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";
  return `/reviews/${reviewId}${qs}`;
}

export async function generateDraftsAction(
  formData: FormData,
): Promise<ReviewActionResult> {
  const ctx = await requireOrgContext();
  const reviewId = String(formData.get("review_id") ?? "");
  const force = formData.get("force") === "true";
  if (!reviewId) return { ok: false, error: "Missing review id." };

  try {
    await generateDraftsForReview({
      orgId: ctx.org.id,
      userId: ctx.user.id,
      reviewId,
      force,
    });
  } catch (err) {
    if (err instanceof EntitlementError) {
      return { ok: false, error: err.message };
    }
    console.error("[reviews/generate] failed", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Could not generate drafts. Please retry.",
    };
  }

  posthog.capture({
    distinctId: ctx.user.id,
    event: "ai_drafts_generated",
    properties: { org_id: ctx.org.id, review_id: reviewId, forced: force },
  });

  revalidatePath(`/reviews/${reviewId}`);
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  return { ok: true, message: "Drafts ready." };
}

export async function saveResponseAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireOrgContext();
  const reviewId = String(formData.get("review_id") ?? "");
  const draftId = String(formData.get("draft_id") ?? "") || null;
  const body = String(formData.get("body") ?? "").trim();
  const action = String(formData.get("action") ?? "save");

  if (!reviewId || !body) {
    redirect(reviewPath(reviewId, { error: "Response cannot be empty." }));
  }

  // Confirm the review belongs to this org and (when given) the draft too.
  const review = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.id, reviewId), eq(reviews.orgId, ctx.org.id)))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!review) redirect(`/inbox?error=Review%20not%20found`);

  if (draftId) {
    const owned = await db
      .select({ id: responseDrafts.id })
      .from(responseDrafts)
      .where(
        and(
          eq(responseDrafts.id, draftId),
          eq(responseDrafts.orgId, ctx.org.id),
        ),
      )
      .limit(1)
      .then((r) => r[0] ?? null);
    if (!owned) redirect(reviewPath(reviewId, { error: "Draft not found." }));
  }

  const existing = await db
    .select()
    .from(reviewResponses)
    .where(
      and(
        eq(reviewResponses.reviewId, reviewId),
        eq(reviewResponses.orgId, ctx.org.id),
      ),
    )
    .orderBy(desc(reviewResponses.updatedAt))
    .limit(1)
    .then((r) => r[0] ?? null);

  const targetStatus = action === "approve" ? "approved" : "draft";

  if (existing) {
    await db
      .update(reviewResponses)
      .set({
        body,
        draftId,
        status:
          existing.status === "posted" ? existing.status : targetStatus,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(reviewResponses.id, existing.id));
  } else {
    await db.insert(reviewResponses).values({
      orgId: ctx.org.id,
      reviewId,
      draftId,
      body,
      status: targetStatus,
    });
  }

  // Bump the review status if we just approved.
  if (targetStatus === "approved") {
    await db
      .update(reviews)
      .set({ status: "approved", updatedAt: new Date() })
      .where(
        and(eq(reviews.id, reviewId), eq(reviews.orgId, ctx.org.id)),
      );
  }

  await writeAudit({
    orgId: ctx.org.id,
    actorUserId: ctx.user.id,
    action: action === "approve" ? "response.approved" : "draft.edited",
    targetType: "review",
    targetId: reviewId,
    metadata: { length: body.length, draft_id: draftId ?? null },
  });

  if (targetStatus === "approved") {
    posthog.capture({
      distinctId: ctx.user.id,
      event: "response_approved",
      properties: {
        org_id: ctx.org.id,
        review_id: reviewId,
        draft_id: draftId ?? null,
        response_length: body.length,
      },
    });
  }

  revalidatePath(`/reviews/${reviewId}`);
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  redirect(
    reviewPath(reviewId, {
      ok: action === "approve" ? "approved" : "saved",
    }),
  );
}

export async function postResponseAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireOrgContext();
  const reviewId = String(formData.get("review_id") ?? "");
  if (!reviewId) redirect(`/inbox?error=Missing%20review`);

  try {
    await postResponseToGoogle({
      orgId: ctx.org.id,
      userId: ctx.user.id,
      reviewId,
    });
  } catch (err) {
    let message = "Could not post to Google.";
    if (err instanceof NotApprovedError) message = err.message;
    else if (err instanceof UnsupportedSourceError) message = err.message;
    else if (err instanceof PostingRateLimitedError) message = err.message;
    else if (err instanceof Error) message = err.message;
    revalidatePath(`/reviews/${reviewId}`);
    redirect(reviewPath(reviewId, { error: message }));
  }

  posthog.capture({
    distinctId: ctx.user.id,
    event: "response_posted_to_google",
    properties: { org_id: ctx.org.id, review_id: reviewId },
  });

  revalidatePath(`/reviews/${reviewId}`);
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  redirect(reviewPath(reviewId, { ok: "posted" }));
}
