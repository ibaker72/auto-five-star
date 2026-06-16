import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgContext } from "@/lib/auth/org";
import { db } from "@/lib/db/client";
import { locations as locationsTable, reviews } from "@/lib/db/schema";
import { getDraftsForReview, getActiveResponse } from "@/lib/ai/generate";
import { PLAN_CONFIG } from "@/lib/billing/plans";
import { getAiResponsesUsedThisMonth } from "@/lib/billing/entitlements";
import { getGoogleConnectionStatus } from "@/lib/integrations/google-tokens";
import { cn } from "@/lib/utils";
import {
  ResponseWorkspace,
  type DraftRow,
  type DraftVariant,
} from "./response-workspace";

export const dynamic = "force-dynamic";

type SearchParams = { ok?: string; error?: string };

export default async function ReviewDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: SearchParams;
}) {
  const ctx = await requireOrgContext();

  const row = await db
    .select({
      review: reviews,
      locationName: locationsTable.name,
    })
    .from(reviews)
    .leftJoin(locationsTable, eq(locationsTable.id, reviews.locationId))
    .where(
      and(eq(reviews.id, params.id), eq(reviews.orgId, ctx.org.id)),
    )
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!row) notFound();

  const [drafts, response, aiUsed, googleStatus] = await Promise.all([
    getDraftsForReview({ orgId: ctx.org.id, reviewId: row.review.id }),
    getActiveResponse({ orgId: ctx.org.id, reviewId: row.review.id }),
    getAiResponsesUsedThisMonth(ctx.org.id),
    getGoogleConnectionStatus(ctx.org.id),
  ]);

  const cfg = PLAN_CONFIG[ctx.org.plan];
  const draftRows: DraftRow[] = drafts
    .filter((d) =>
      ["warm", "professional", "brief"].includes(d.variant),
    )
    .map((d) => ({
      id: d.id,
      variant: d.variant as DraftVariant,
      body: d.body,
      rationale: d.rationale,
      model: d.model,
      generatedAt: d.generatedAt.toISOString(),
    }));

  const responseRow = response
    ? {
        id: response.id,
        body: response.body,
        status: response.status,
        draftId: response.draftId,
        postedAt: response.postedAt?.toISOString() ?? null,
        errorMessage: response.errorMessage,
      }
    : null;

  const stars =
    "★".repeat(row.review.rating) + "☆".repeat(5 - row.review.rating);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/inbox">← Inbox</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <CardTitle className="text-lg">
                  {row.review.reviewerName ?? "Anonymous"}
                </CardTitle>
                <CardDescription>
                  <span
                    className={cn(
                      "text-amber-500",
                      row.review.rating <= 2 && "text-rose-500",
                    )}
                  >
                    {stars}
                  </span>{" "}
                  · {row.review.source.toUpperCase()}
                  {row.locationName ? ` · ${row.locationName}` : ""}
                </CardDescription>
              </div>
              <span className="text-xs text-muted-foreground">
                {row.review.postedAt.toLocaleString()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="whitespace-pre-line text-sm">
              {row.review.body ?? ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Status:{" "}
              <strong className="text-foreground">{row.review.status}</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Response</CardTitle>
            <CardDescription>
              {drafts.length > 0
                ? "Pick a variant, tune it to your voice, then approve and post."
                : "Generate three AI variants to start. One generation counts as 1 AI response."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponseWorkspace
              reviewId={row.review.id}
              source={row.review.source}
              rating={row.review.rating}
              hasDrafts={draftRows.length > 0}
              drafts={draftRows}
              response={responseRow}
              hasGoogleConnection={googleStatus.connected}
              aiQuota={{
                used: aiUsed,
                limit: cfg.monthlyAiResponses,
              }}
              notice={{ ok: searchParams.ok, error: searchParams.error }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
