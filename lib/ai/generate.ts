import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  brandVoices,
  locations,
  organizations,
  responseDrafts,
  reviews,
  reviewResponses,
  type ResponseDraft,
} from "@/lib/db/schema";
import {
  generateResponseDrafts,
  type GenerationResult,
} from "@/lib/integrations/openai";
import {
  incrementAiUsage,
  requireEntitlement,
} from "@/lib/billing/entitlements";
import { writeAudit } from "@/lib/audit";
import {
  PROMPT_VERSION,
  type PromptInput,
} from "@/lib/ai/prompts/responseGenerator.v1";

export class ReviewNotFoundError extends Error {
  constructor() {
    super("Review not found in this organization");
    this.name = "ReviewNotFoundError";
  }
}

export type GenerateDraftsResult = {
  drafts: ResponseDraft[];
  fromCache: boolean;
  fixture: boolean;
};

export type GenerateDraftsInput = {
  orgId: string;
  userId: string;
  reviewId: string;
  /** When true, deletes existing drafts for this review and creates a new batch. */
  force?: boolean;
};

/**
 * Generate (or fetch cached) AI draft variants for a single review.
 *
 * Idempotency: when drafts already exist for the review and `force=false`,
 * returns the cached drafts without calling OpenAI. When `force=true`, deletes
 * the existing draft batch in a single transactional step and creates a fresh
 * batch. We use delete-then-insert (rather than versioning) because the UI
 * always operates on the latest variant set; the audit log preserves the
 * generation history.
 *
 * One generation event counts as 1 AI response in `usage_counters`, regardless
 * of the 3 variants produced.
 */
export async function generateDraftsForReview(
  input: GenerateDraftsInput,
): Promise<GenerateDraftsResult> {
  const review = await db
    .select({
      review: reviews,
      location: locations,
      org: organizations,
    })
    .from(reviews)
    .innerJoin(locations, eq(locations.id, reviews.locationId))
    .innerJoin(organizations, eq(organizations.id, reviews.orgId))
    .where(
      and(eq(reviews.id, input.reviewId), eq(reviews.orgId, input.orgId)),
    )
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!review) throw new ReviewNotFoundError();

  // Cache check
  const existing = await db
    .select()
    .from(responseDrafts)
    .where(
      and(
        eq(responseDrafts.reviewId, input.reviewId),
        eq(responseDrafts.orgId, input.orgId),
      ),
    )
    .orderBy(desc(responseDrafts.generatedAt));

  if (existing.length > 0 && !input.force) {
    return { drafts: latestVariantBatch(existing), fromCache: true, fixture: false };
  }

  // Enforce the monthly AI quota before we hit OpenAI.
  await requireEntitlement(input.orgId, "ai.generate");

  // Load brand voice (optional).
  const voiceRow = await db
    .select()
    .from(brandVoices)
    .where(eq(brandVoices.orgId, input.orgId))
    .limit(1)
    .then((r) => r[0] ?? null);

  // Build prompt input. We intentionally include only the fields the prompt
  // needs — no DB ids, no internal status, no PII beyond what the reviewer
  // already shared publicly.
  const promptInput: PromptInput = {
    business: {
      name: review.org.name,
      industry: review.org.industry,
    },
    location: {
      name: review.location.name,
      city: review.location.city,
      state: review.location.state,
    },
    voice: {
      formal: voiceRow?.toneFormal ?? 50,
      warm: voiceRow?.toneWarm ?? 70,
      brevity: voiceRow?.toneBrevity ?? 50,
      samples: voiceRow?.samples ?? [],
    },
    review: {
      rating: review.review.rating,
      reviewerName: review.review.reviewerName,
      body: review.review.body,
      postedAt: review.review.postedAt.toISOString(),
      language: review.review.language,
    },
  };

  let result: GenerationResult;
  try {
    result = await generateResponseDrafts(promptInput);
  } catch (err) {
    // Never log the prompt body. Surface a redacted error.
    console.error(
      "[ai/generate] OpenAI generation failed",
      err instanceof Error ? err.message : String(err),
    );
    throw err;
  }

  // Replace any prior batch (force) or insert fresh.
  await db
    .delete(responseDrafts)
    .where(
      and(
        eq(responseDrafts.reviewId, input.reviewId),
        eq(responseDrafts.orgId, input.orgId),
      ),
    );

  const variantRows = (
    ["warm", "professional", "brief"] as const
  ).map((variant) => ({
    orgId: input.orgId,
    reviewId: input.reviewId,
    variant,
    body: result.response.variants[variant].body,
    rationale: result.response.variants[variant].rationale,
    model: result.model,
    promptVersion: PROMPT_VERSION,
    tokensInput: Math.round(result.tokensInput / 3),
    tokensOutput: Math.round(result.tokensOutput / 3),
    costCents: Math.round(result.costCents / 3),
    sentiment: result.response.sentiment,
    flags: result.response.flags,
  }));

  const inserted = await db
    .insert(responseDrafts)
    .values(variantRows)
    .returning();

  await db
    .update(reviews)
    .set({ status: "drafted", updatedAt: new Date() })
    .where(
      and(
        eq(reviews.id, input.reviewId),
        eq(reviews.orgId, input.orgId),
      ),
    );

  // One generation event counts as 1 quota usage even though 3 variants are
  // produced. Costs and tokens are recorded as the sum across variants.
  await incrementAiUsage(input.orgId, 1, result.costCents);

  await writeAudit({
    orgId: input.orgId,
    actorUserId: input.userId,
    action: "draft.generated",
    targetType: "review",
    targetId: input.reviewId,
    metadata: {
      model: result.model,
      prompt_version: PROMPT_VERSION,
      tokens_input: result.tokensInput,
      tokens_output: result.tokensOutput,
      cost_cents: result.costCents,
      fixture: result.fixture,
      forced: !!input.force,
      sentiment: result.response.sentiment,
      flags: result.response.flags,
      rating: review.review.rating,
    },
  });

  return { drafts: inserted, fromCache: false, fixture: result.fixture };
}

/**
 * If a review has multiple generation batches (shouldn't happen given the
 * delete-then-insert pattern), keep only the most recent one for display.
 */
function latestVariantBatch(drafts: ResponseDraft[]): ResponseDraft[] {
  if (drafts.length <= 3) return drafts;
  const latestTs = drafts[0]?.generatedAt?.getTime() ?? 0;
  return drafts.filter(
    (d) => Math.abs((d.generatedAt?.getTime() ?? 0) - latestTs) < 5_000,
  );
}

export async function getActiveResponse(args: {
  orgId: string;
  reviewId: string;
}) {
  const rows = await db
    .select()
    .from(reviewResponses)
    .where(
      and(
        eq(reviewResponses.reviewId, args.reviewId),
        eq(reviewResponses.orgId, args.orgId),
      ),
    )
    .orderBy(desc(reviewResponses.updatedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getDraftsForReview(args: {
  orgId: string;
  reviewId: string;
}) {
  return db
    .select()
    .from(responseDrafts)
    .where(
      and(
        eq(responseDrafts.reviewId, args.reviewId),
        eq(responseDrafts.orgId, args.orgId),
      ),
    )
    .orderBy(desc(responseDrafts.generatedAt));
}
