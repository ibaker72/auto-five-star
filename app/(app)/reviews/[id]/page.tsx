import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgContext } from "@/lib/auth/org";
import { db } from "@/lib/db/client";
import { locations as locationsTable, reviews } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function ReviewDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await requireOrgContext();

  const rows = await db
    .select({
      review: reviews,
      locationName: locationsTable.name,
    })
    .from(reviews)
    .leftJoin(locationsTable, eq(locationsTable.id, reviews.locationId))
    .where(
      and(eq(reviews.id, params.id), eq(reviews.orgId, ctx.org.id)),
    )
    .limit(1);
  const row = rows[0];
  if (!row) notFound();

  const stars = "★".repeat(row.review.rating) + "☆".repeat(5 - row.review.rating);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/inbox">← Inbox</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <CardTitle className="text-lg">
                {row.review.reviewerName ?? "Anonymous"}
              </CardTitle>
              <CardDescription>
                {stars} · {row.review.source.toUpperCase()}
                {row.locationName ? ` · ${row.locationName}` : ""}
              </CardDescription>
            </div>
            <span className="text-xs text-muted-foreground">
              {row.review.postedAt.toLocaleString()}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="whitespace-pre-line text-sm">{row.review.body ?? ""}</p>
          <p className="text-xs text-muted-foreground">
            Status: <strong className="text-foreground">{row.review.status}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI drafts</CardTitle>
          <CardDescription>
            Three variants (warm / professional / brief) and the "Post to Google"
            button land in PR #5.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
