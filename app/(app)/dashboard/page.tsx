import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome to AutoFiveStar
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {ctx.user.email}. Plan: {cfg.name}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="New reviews" value={newReviewRows.length} />
        <Stat label="Drafted / approved" value={draftedReviewRows.length} />
        <Stat label="Posted" value={postedReviewRows.length} />
        <Stat
          label="AI responses this month"
          value={aiLabel}
        />
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
          </CardContent>
        </Card>
      )}
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
