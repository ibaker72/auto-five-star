"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { centsToUsd, cn } from "@/lib/utils";
import {
  BILLING_INTERVALS,
  PLAN_CONFIG,
  PLANS,
  type BillingInterval,
  type Plan,
} from "@/lib/billing/plans";

type Props = {
  currentPlan: Plan | null;
  hasActiveSubscription: boolean;
};

export function PlanCards({ currentPlan, hasActiveSubscription }: Props) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-md border bg-card p-1 text-sm w-fit">
        {BILLING_INTERVALS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setInterval(value)}
            className={cn(
              "rounded px-3 py-1.5 capitalize transition-colors",
              interval === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value}
            {value === "yearly" ? (
              <span
                className={cn(
                  "ml-1 rounded px-1.5 py-0.5 text-[10px]",
                  interval === "yearly"
                    ? "bg-primary-foreground/20"
                    : "bg-emerald-100 text-emerald-700",
                )}
              >
                2 months free
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((id) => {
          const plan = PLAN_CONFIG[id];
          const isCurrent = id === currentPlan;
          const priceCents =
            interval === "monthly"
              ? plan.priceMonthlyCents
              : plan.priceYearlyCents;
          const perLabel = interval === "monthly" ? "/ month" : "/ year";
          return (
            <Card key={id} className={cn(isCurrent && "border-primary")}>
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-2xl font-semibold text-foreground">
                    {centsToUsd(priceCents)}
                  </span>{" "}
                  {perLabel}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {plan.features.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>

                {isCurrent && hasActiveSubscription ? (
                  <Button type="button" variant="secondary" className="w-full" disabled>
                    Current plan
                  </Button>
                ) : (
                  <form action="/api/stripe/checkout" method="post">
                    <input type="hidden" name="plan" value={id} />
                    <input type="hidden" name="interval" value={interval} />
                    <Button
                      type="submit"
                      variant={isCurrent ? "secondary" : "default"}
                      className="w-full"
                    >
                      {hasActiveSubscription ? "Switch to " + plan.name : "Start 7-day trial"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
