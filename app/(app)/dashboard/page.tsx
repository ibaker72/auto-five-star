import Link from "next/link";
import { and, desc, eq, inArray, lte } from "drizzle-orm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RatingDistribution } from "@/components/analytics/rating-distribution";
import { ReviewTrend } from "@/components/analytics/review-trend";
import { requireOrgContext } from "@/lib/auth/org";
import { getGoogleConnectionStatus } from "@/lib/integrations/google-tokens";
import { db } from "@/lib/db/client";
import { reviews } from "@/lib/db/schema";
import { PLAN_CONFIG } from "@/lib/billing/plans";
import { getAiResponsesUsedThisMonth } from "@/lib/billing/entitlements";
import { computeReviewAnalytics } from "@/lib/analytics/reviews";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await requireOrgContext();

  const [analytics, aiUsed, googleStatus, urgentRows] = await Promise.all([
    computeReviewAnalytics({ orgId: ctx.org.id }),
    getAiResponsesUsedThisMonth(ctx.org.id),
    getGoogleConnectionStatus(ctx.org.id),
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

  const notConnected = !googleStatus.connected;
  const noLocations = analytics.totalReviews === 0;
  const onboardingIncomplete = !ctx.org.onboardingCompletedAt;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {ctx.org.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {ctx.user.email}. Plan: {cfg.name}.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Last review sync:{" "}
          {analytics.lastSyncedAt
            ? analytics.lastSyncedAt.toLocaleString()
            : "never"}
        </div>
      </div>

      {onboardingIncomplete ? (
        <Alert>
          <AlertTitle>Finish setting up</AlertTitle>
          <AlertDescription>
            Two minutes to set your industry, brand voice, and alerts.{" "}
            <Link href="/onboarding" className="font-medium underline">
              Open onboarding →
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total reviews"
          value={analytics.totalReviews.toString()}
          hint={
            analytics.reviewsThisWeek > 0
              ? `${analytics.reviewsThisWeek} this week`
              : undefined
          }
        />
        <Stat
          label="Average rating"
          value={
            analytics.averageRating !== null
              ? analytics.averageRating.toFixed(1)
              : "—"
          }
          hint={
            analytics.averageRating !== null
              ? "out of 5.0"
              : "no reviews yet"
          }
        />
        <Stat
          label="Response rate"
          value={
            analytics.responseRate !== null
              ? `${analytics.responseRate}%`
              : "—"
          }
          hint={`${analytics.postedCount} posted`}
        />
        <Stat
          label="AI responses (mo)"
          value={aiLabel}
          hint="resets monthly"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Unanswered"
          value={analytics.unanswered.toString()}
          hint={
            analytics.urgentUnanswered > 0
              ? `${analytics.urgentUnanswered} urgent`
              : undefined
          }
        />
        <Stat
          label="This week"
          value={analytics.reviewsThisWeek.toString()}
        />
        <Stat
          label="This month"
          value={analytics.reviewsThisMonth.toString()}
        />
        <Stat
          label="Posted (all-time)"
          value={analytics.postedCount.toString()}
        />
      </div>

      {(notConnected || noLocations) ? (
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
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Rating distribution</CardTitle>
              <CardDescription>All-time across your locations.</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.totalReviews === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                <RatingDistribution
                  distribution={analytics.ratingDistribution}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent review trend</CardTitle>
              <CardDescription>Last 8 weeks.</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.totalReviews === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                <ReviewTrend trend={analytics.trend} />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {urgentRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Negative reviews to handle</CardTitle>
            <CardDescription>
              1-2 star reviews from your locations. Reply first; learn from
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

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/inbox?status=new">Generate drafts for unanswered</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/inbox">Open inbox</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/locations">Pull reviews now</Link>
        </Button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
