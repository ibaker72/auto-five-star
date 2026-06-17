"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { requireOrgContext } from "@/lib/auth/org";
import { requireEntitlement } from "@/lib/billing/entitlements";
import { db } from "@/lib/db/client";
import { reviews } from "@/lib/db/schema";
import { writeAudit } from "@/lib/audit";
import {
  generateDraftsForReview,
  ReviewNotFoundError,
} from "@/lib/ai/generate";
import {
  NotApprovedError,
  postResponseToGoogle,
  UnsupportedSourceError,
} from "@/lib/ai/post-response";
import { EntitlementError } from "@/lib/billing/entitlements";

const MAX_BULK = 50;

function parseIds(formData: FormData): string[] {
  const raw = formData.getAll("review_id");
  const ids = raw
    .map((v) => String(v).trim())
    .filter((v) => /^[0-9a-fA-F-]{36}$/.test(v));
  return Array.from(new Set(ids)).slice(0, MAX_BULK);
}

function backToInbox(params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`/inbox?${qs}`);
}

async function ensureOrgOwnsReviews(
  orgId: string,
  ids: string[],
): Promise<string[]> {
  if (ids.length === 0) return [];
  const owned = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(eq(reviews.orgId, orgId), inArray(reviews.id, ids)),
    );
  return owned.map((r) => r.id);
}

export async function bulkMarkSkippedAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireOrgContext();
  try {
    await requireEntitlement(ctx.org.id, "actions.bulk");
  } catch (err) {
    backToInbox({
      bulk: "error",
      message: err instanceof EntitlementError ? err.message : "Not entitled.",
    });
  }
  const ids = parseIds(formData);
  if (ids.length === 0) backToInbox({ bulk: "error", message: "Pick at least one review." });

  const ownedIds = await ensureOrgOwnsReviews(ctx.org.id, ids);
  if (ownedIds.length === 0) backToInbox({ bulk: "error", message: "No reviews found." });

  await db
    .update(reviews)
    .set({ status: "skipped", updatedAt: new Date() })
    .where(
      and(
        eq(reviews.orgId, ctx.org.id),
        inArray(reviews.id, ownedIds),
      ),
    );

  await writeAudit({
    orgId: ctx.org.id,
    actorUserId: ctx.user.id,
    action: "review.skipped",
    targetType: "review.bulk",
    metadata: { count: ownedIds.length, ids: ownedIds.slice(0, 25) },
  });

  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  backToInbox({ bulk: "marked_skipped", count: String(ownedIds.length) });
}

export async function bulkGenerateDraftsAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireOrgContext();
  try {
    await requireEntitlement(ctx.org.id, "actions.bulk");
  } catch (err) {
    backToInbox({
      bulk: "error",
      message: err instanceof EntitlementError ? err.message : "Not entitled.",
    });
  }
  const ids = parseIds(formData);
  if (ids.length === 0) backToInbox({ bulk: "error", message: "Pick at least one review." });

  const ownedIds = await ensureOrgOwnsReviews(ctx.org.id, ids);
  if (ownedIds.length === 0) backToInbox({ bulk: "error", message: "No reviews found." });

  let generated = 0;
  let cached = 0;
  let failed = 0;
  let quotaHit = false;
  for (const id of ownedIds) {
    try {
      const r = await generateDraftsForReview({
        orgId: ctx.org.id,
        userId: ctx.user.id,
        reviewId: id,
      });
      if (r.fromCache) cached += 1;
      else generated += 1;
    } catch (err) {
      if (err instanceof EntitlementError) {
        quotaHit = true;
        break;
      }
      if (err instanceof ReviewNotFoundError) {
        failed += 1;
        continue;
      }
      console.error("[inbox/bulk-generate] failed", id, err);
      failed += 1;
    }
  }

  await writeAudit({
    orgId: ctx.org.id,
    actorUserId: ctx.user.id,
    action: "draft.generated",
    targetType: "review.bulk",
    metadata: {
      requested: ownedIds.length,
      generated,
      cached,
      failed,
      quota_hit: quotaHit,
    },
  });

  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  if (quotaHit) {
    backToInbox({
      bulk: "error",
      message:
        "Monthly AI quota reached during bulk generate. Some reviews were skipped.",
    });
  }
  backToInbox({
    bulk: "generated",
    count: String(generated + cached),
  });
}

export async function bulkPostApprovedAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireOrgContext();
  try {
    await requireEntitlement(ctx.org.id, "actions.bulk");
  } catch (err) {
    backToInbox({
      bulk: "error",
      message: err instanceof EntitlementError ? err.message : "Not entitled.",
    });
  }
  const ids = parseIds(formData);
  if (ids.length === 0) backToInbox({ bulk: "error", message: "Pick at least one review." });

  const ownedIds = await ensureOrgOwnsReviews(ctx.org.id, ids);
  if (ownedIds.length === 0) backToInbox({ bulk: "error", message: "No reviews found." });

  let posted = 0;
  let skipped = 0;
  let failed = 0;
  for (const id of ownedIds) {
    try {
      await postResponseToGoogle({
        orgId: ctx.org.id,
        userId: ctx.user.id,
        reviewId: id,
      });
      posted += 1;
    } catch (err) {
      if (err instanceof NotApprovedError || err instanceof UnsupportedSourceError) {
        skipped += 1;
        continue;
      }
      console.error("[inbox/bulk-post] failed", id, err);
      failed += 1;
    }
  }

  await writeAudit({
    orgId: ctx.org.id,
    actorUserId: ctx.user.id,
    action: "response.posted",
    targetType: "review.bulk",
    metadata: {
      requested: ownedIds.length,
      posted,
      skipped,
      failed,
    },
  });

  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  if (posted === 0 && failed > 0) {
    backToInbox({
      bulk: "error",
      message: `${failed} post(s) failed.`,
    });
  }
  backToInbox({ bulk: "posted", count: String(posted) });
}
