import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { centsToUsd } from "@/lib/utils";
import { PLAN_CONFIG, PLANS } from "@/lib/billing/plans";
import { requireOrgContext } from "@/lib/auth/org";
import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const ctx = await requireOrgContext();

  const sub = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.orgId, ctx.org.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Plan: <strong>{ctx.org.plan}</strong>
          {ctx.org.trialEndsAt
            ? ` · Trial ends ${ctx.org.trialEndsAt.toLocaleDateString()}`
            : null}
        </p>
      </div>

      {sub ? (
        <Card>
          <CardHeader>
            <CardTitle>Current subscription</CardTitle>
            <CardDescription>Status: {sub.status}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {sub.currentPeriodEnd ? (
              <p>
                Renews on {sub.currentPeriodEnd.toLocaleDateString()}.
              </p>
            ) : null}
            {sub.cancelAtPeriodEnd ? (
              <p>Set to cancel at end of period.</p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No active subscription</CardTitle>
            <CardDescription>
              Pick a plan to start your 14-day free trial. You won't be charged
              until day 15.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Stripe Checkout is wired up in PR #3.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((id) => {
          const plan = PLAN_CONFIG[id];
          return (
            <Card key={id} className={id === ctx.org.plan ? "border-primary" : undefined}>
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-2xl font-semibold text-foreground">
                    {centsToUsd(plan.priceMonthlyCents)}
                  </span>{" "}
                  / month
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {plan.features.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant={id === ctx.org.plan ? "secondary" : "default"}
                  className="w-full"
                  disabled
                >
                  {id === ctx.org.plan ? "Current plan" : "Start trial"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        AutoFiveStar helps you respond to reviews professionally. We do not
        guarantee ratings, rankings, or revenue.
      </p>
    </div>
  );
}
