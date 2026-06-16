import Link from "next/link";
import { and, desc, eq, inArray, lte, max } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireOrgContext } from "@/lib/auth/org";
import { getGoogleConnectionStatus } from "@/lib/integrations/google-tokens";
import { db } from "@/lib/db/client";
import { locations, reviews } from "@/lib/db/schema";
import { PLAN_CONFIG } from "@/lib/billing/plans";
import { getAiResponsesUsedThisMonth } from "@/lib/billing/entitlements";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await requireOrgContext();

  const [
    locRows,
    newReviewRows,
    draftedReviewRows,
    postedReviewRows,
    aiUsed,
    googleStatus,
    lastSyncRow,
    urgentRows,
  ] = await Promise.all([
    db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.orgId, ctx.org.id)),
    db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(eq(reviews.orgId, ctx.org.id), eq(reviews.status, "new")),
      ),
    db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.orgId, ctx.org.id),
          inArray(reviews.status, ["drafted", "approved"]),
        ),
      ),
    db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(eq(reviews.orgId, ctx.org.id), eq(reviews.status, "posted")),
      ),
    getAiResponsesUsedThisMonth(ctx.org.id),
    getGoogleConnectionStatus(ctx.org.id),
    db
      .select({ ts: max(reviews.lastSyncedAt) })
      .from(reviews)
      .where(eq(reviews.orgId, ctx.org.id))
      .then((r) => r[0]),
    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        reviewerName: reviews.reviewerName,
        postedAt: reviews.postedAt,
        body: reviews.body,
        status: reviews.status,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.orgId, ctx.org.id),
          lte(reviews.rating, 2),
          inArray(reviews.status, ["new", "drafted", "flagged"]),
        ),
      )
      .orderBy(desc(reviews.postedAt))
      .limit(3),
  ]);

  const cfg = PLAN_CONFIG[ctx.org.plan];
  const aiLabel =
    cfg.monthlyAiResponses === null
      ? `${aiUsed} (unlimited)`
      : `${aiUsed} / ${cfg.monthlyAiResponses}`;

  const noLocations = locRows.length === 0;
  const notConnected = !googleStatus.connected;
  const showConnectCta = notConnected || noLocations;
  const unanswered = newReviewRows.length + draftedReviewRows.length;
  const lastSyncedAt = lastSyncRow?.ts ?? null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome to AutoFiveStar
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {ctx.user.email}. Plan: {cfg.name}.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Last review sync:{" "}
          {lastSyncedAt ? lastSyncedAt.toLocaleString() : "never"}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="New reviews" value={newReviewRows.length} />
        <Stat label="Drafted / approved" value={draftedReviewRows.length} />
        <Stat label="Posted" value={postedReviewRows.length} />
        <Stat label="AI responses this month" value={aiLabel} />
      </div>

      {showConnectCta ? (
        <Card>
          <CardHeader>
            <CardTitle>Next step</CardTitle>
            <CardDescription>
              {notConnected
                ? "Connect your Google Business Profile to start pulling reviews."
                : "Pick a location and pull your first reviews."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/locations">Go to locations</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/billing">View plan & billing</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
            <CardDescription>
              {unanswered === 0
                ? "All caught up — nothing waiting for a reply."
                : `${unanswered} review${unanswered === 1 ? "" : "s"} waiting for a reply.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/inbox?status=new">
                Generate drafts for unanswered reviews
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/inbox">Open inbox</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/locations">Pull reviews now</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {urgentRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Negative reviews to handle</CardTitle>
            <CardDescription>
              1–2 star reviews from your locations. Reply first; learn from
              them after.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {urgentRows.map((r) => (
              <Link
                key={r.id}
                href={`/reviews/${r.id}`}
                className="block rounded-md border bg-card p-3 text-sm transition-colors hover:bg-secondary/40"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-rose-500">
                      {"★".repeat(r.rating) + "☆".repeat(5 - r.rating)}
                    </span>
                    <span className="font-medium">
                      {r.reviewerName ?? "Anonymous"}
                    </span>
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-rose-700">
                      Needs attention
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {r.postedAt.toLocaleDateString()}
                  </span>
                </div>
                {r.body ? (
                  <p className="mt-1 line-clamp-2 text-muted-foreground">
                    {r.body}
                  </p>
                ) : null}
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
