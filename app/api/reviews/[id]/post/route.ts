import { NextResponse, type NextRequest } from "next/server";
import { requireOrgContext } from "@/lib/auth/org";
import {
  NotApprovedError,
  PostingRateLimitedError,
  postResponseToGoogle,
  UnsupportedSourceError,
} from "@/lib/ai/post-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let ctx;
  try {
    ctx = await requireOrgContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await postResponseToGoogle({
      orgId: ctx.org.id,
      userId: ctx.user.id,
      reviewId: id,
    });
    return NextResponse.json({
      ok: true,
      response_id: result.responseId,
      review_id: result.reviewId,
      posted_at: result.postedAt,
      source_response_id: result.sourceResponseId,
    });
  } catch (err) {
    if (err instanceof NotApprovedError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof UnsupportedSourceError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof PostingRateLimitedError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/reviews/post] failed", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not post to Google.",
      },
      { status: 500 },
    );
  }
}
