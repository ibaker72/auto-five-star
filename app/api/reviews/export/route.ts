import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { requireOrgContext } from "@/lib/auth/org";
import { requireEntitlement, EntitlementError } from "@/lib/billing/entitlements";
import { db } from "@/lib/db/client";
import { locations, reviews } from "@/lib/db/schema";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_EXPORT = 500;

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = await requireOrgContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requireEntitlement(ctx.org.id, "actions.bulk");
  } catch (err) {
    if (err instanceof EntitlementError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    throw err;
  }

  const form = await request.formData();
  const rawIds = form.getAll("review_id").map((v) => String(v).trim());
  const ids = Array.from(
    new Set(rawIds.filter((v) => /^[0-9a-fA-F-]{36}$/.test(v))),
  ).slice(0, MAX_EXPORT);

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Pick at least one review." },
      { status: 400 },
    );
  }

  const rows = await db
    .select({
      review: reviews,
      locationName: locations.name,
    })
    .from(reviews)
    .leftJoin(locations, eq(locations.id, reviews.locationId))
    .where(
      and(eq(reviews.orgId, ctx.org.id), inArray(reviews.id, ids)),
    );

  const header = [
    "id",
    "source",
    "source_review_id",
    "location",
    "reviewer_name",
    "rating",
    "body",
    "language",
    "posted_at",
    "status",
    "sentiment",
  ];

  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.review.id,
        r.review.source,
        r.review.sourceReviewId,
        r.locationName ?? "",
        r.review.reviewerName ?? "",
        r.review.rating,
        r.review.body ?? "",
        r.review.language ?? "",
        r.review.postedAt.toISOString(),
        r.review.status,
        r.review.sentiment ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  await writeAudit({
    orgId: ctx.org.id,
    actorUserId: ctx.user.id,
    action: "review.synced", // closest existing audit action; treated as "exported"
    targetType: "review.bulk_export",
    metadata: { count: rows.length },
  });

  const csv = `${lines.join("\n")}\n`;
  const filename = `autofivestar-reviews-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
