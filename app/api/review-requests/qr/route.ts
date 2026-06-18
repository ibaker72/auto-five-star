import { NextResponse, type NextRequest } from "next/server";
import { requireOrgContext } from "@/lib/auth/org";
import {
  generateQrPngBuffer,
  generateQrSvg,
  validateReviewUrl,
  QrValidationError,
} from "@/lib/review-requests/qr";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db/client";
import { reviewRequestEvents } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  let ctx;
  try {
    ctx = await requireOrgContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const url = searchParams.get("url") ?? "";
  const format = searchParams.get("format") ?? "png";

  let safeUrl: string;
  try {
    safeUrl = validateReviewUrl(url);
  } catch (err) {
    const message =
      err instanceof QrValidationError ? err.message : "Invalid URL.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await db.insert(reviewRequestEvents).values({
    orgId: ctx.org.id,
    eventName: "qr.generated",
    payload: { format, url: safeUrl },
  });

  await writeAudit({
    orgId: ctx.org.id,
    actorUserId: ctx.user.id,
    action: "review_request.qr.generated",
    metadata: { format, url: safeUrl },
  });

  if (format === "svg") {
    const svg = await generateQrSvg(safeUrl);
    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="review-qr.svg"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const png = await generateQrPngBuffer(safeUrl);
  const ab = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
  return new NextResponse(ab, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="review-qr.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
