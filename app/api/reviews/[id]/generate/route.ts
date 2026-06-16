import { NextResponse, type NextRequest } from "next/server";
import { requireOrgContext } from "@/lib/auth/org";
import {
  generateDraftsForReview,
  ReviewNotFoundError,
} from "@/lib/ai/generate";
import { EntitlementError } from "@/lib/billing/entitlements";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  let ctx;
  try {
    ctx = await requireOrgContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let force = false;
  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as
      | { force?: boolean }
      | null;
    force = body?.force === true;
  } else {
    const form = await request.formData();
    force = form.get("force") === "true";
  }

  try {
    const result = await generateDraftsForReview({
      orgId: ctx.org.id,
      userId: ctx.user.id,
      reviewId: params.id,
      force,
    });
    return NextResponse.json({
      drafts: result.drafts.map((d) => ({
        id: d.id,
        variant: d.variant,
        body: d.body,
        rationale: d.rationale,
        model: d.model,
        generatedAt: d.generatedAt,
      })),
      fromCache: result.fromCache,
      fixture: result.fixture,
    });
  } catch (err) {
    if (err instanceof ReviewNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof EntitlementError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    console.error("[api/reviews/generate] failed", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not generate drafts.",
      },
      { status: 500 },
    );
  }
}
