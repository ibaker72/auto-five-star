import { and, desc, eq, gte } from "drizzle-orm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgContext } from "@/lib/auth/org";
import { db } from "@/lib/db/client";
import { locations, subscriptions, usageCounters } from "@/lib/db/schema";
import { PLAN_CONFIG } from "@/lib/billing/plans";
import { PlanCards } from "./plan-cards";

export const dynamic = "force-dynamic";

type SearchParams = {
  checkout?: string;
  portal?: string;
  message?: string;
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireOrgContext();

  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  );

  const [sub, locCount, usage] = await Promise.all([
    db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.orgId, ctx.org.id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.orgId, ctx.org.id))
      .then((r) => r.length),
    db
      .select()
      .from(usageCounters)
      .where(
        and(
          eq(usageCounters.orgId, ctx.org.id),
          gte(usageCounters.periodStart, monthStart),
        ),
      )
      .limit(1)
      .then((r) => r[0] ?? null),
  ]);

  const cfg = PLAN_CONFIG[ctx.org.plan];
  const aiUsed = usage?.aiResponsesUsed ?? 0;
  const aiLimit = cfg.monthlyAiResponses;
  const hasActiveSubscription =
    !!sub && ["active", "trialing", "past_due"].includes(sub.status);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Current plan: <strong>{cfg.name}</strong>
          {ctx.org.trialEndsAt
            ? ` · Trial ends ${ctx.org.trialEndsAt.toLocaleDateString()}`
            : null}
        </p>
      </div>

      <Notice searchParams={searchParams} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current subscription</CardTitle>
            <CardDescription>
              {sub
                ? `Status: ${sub.status}`
                : "No active subscription yet"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {sub ? (
              <>
                {sub.currentPeriodEnd ? (
                  <p>Renews {sub.currentPeriodEnd.toLocaleDateString()}.</p>
                ) : null}
                {sub.cancelAtPeriodEnd ? (
                  <p>Set to cancel at the end of the current period.</p>
                ) : null}
                {sub.trialEnd && sub.trialEnd.getTime() > Date.now() ? (
                  <p>Trial ends {sub.trialEnd.toLocaleDateString()}.</p>
                ) : null}
              </>
            ) : (
              <p>
                Pick a plan below to start your 14-day free trial. You won't be
                charged until day 15.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This month's usage</CardTitle>
            <CardDescription>
              Resets on the first of every month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <UsageRow
              label="Locations connected"
              used={locCount}
              limit={cfg.maxLocations}
            />
            <UsageRow
              label="AI responses generated"
              used={aiUsed}
              limit={aiLimit}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage billing</CardTitle>
          <CardDescription>
            Update card, see invoices, change interval, or cancel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ctx.org.stripeCustomerId ? (
            <form action="/api/stripe/portal" method="post">
              <Button type="submit" variant="outline">
                Open billing portal
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Start a subscription to enable the billing portal.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Plans</h2>
        <PlanCards
          currentPlan={ctx.org.plan}
          hasActiveSubscription={hasActiveSubscription}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        AutoFiveStar helps you respond to reviews professionally. We do not
        guarantee ratings, rankings, or revenue.
      </p>
    </div>
  );
}

function Notice({ searchParams }: { searchParams: SearchParams }) {
  if (searchParams.checkout === "success") {
    return (
      <Alert variant="success">
        <AlertTitle>Trial started</AlertTitle>
        <AlertDescription>
          Your subscription is being set up. Status will refresh in a moment.
        </AlertDescription>
      </Alert>
    );
  }
  if (searchParams.checkout === "cancelled") {
    return (
      <Alert>
        <AlertTitle>Checkout cancelled</AlertTitle>
        <AlertDescription>You can pick a plan whenever you're ready.</AlertDescription>
      </Alert>
    );
  }
  if (searchParams.checkout === "error" || searchParams.portal === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          {searchParams.message ?? "Please try again."}
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}

function UsageRow({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  const limitLabel = limit === null ? "Unlimited" : limit.toString();
  const pct = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-foreground">{label}</span>
        <span>
          {used} / {limitLabel}
        </span>
      </div>
      {limit !== null ? (
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary"
            style={{ width: `${pct}%` }}
            aria-hidden="true"
          />
        </div>
      ) : null}
    </div>
  );
}
