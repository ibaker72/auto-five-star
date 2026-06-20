export const PLANS = ["starter", "growth", "pro"] as const;
export type Plan = (typeof PLANS)[number];

export const BILLING_INTERVALS = ["monthly", "yearly"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export type PlanConfig = {
  id: Plan;
  name: string;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  maxLocations: number;
  /** Numeric monthly quota, or null = unlimited. */
  monthlyAiResponses: number | null;
  sources: Array<"google" | "yelp">;
  features: string[];
  yelp: boolean;
  smsAlerts: boolean;
  bulkActions: boolean;
};

export const PLAN_CONFIG: Record<Plan, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthlyCents: 9900,
    priceYearlyCents: 9900 * 10, // 2 months free
    maxLocations: 1,
    monthlyAiResponses: 50,
    sources: ["google"],
    features: [
      "Google review monitoring",
      "AI response drafts (50 / month)",
      "Review request link + QR code",
      "Monthly review report",
      "Email review alerts",
    ],
    yelp: false,
    smsAlerts: false,
    bulkActions: false,
  },
  growth: {
    id: "growth",
    name: "Growth",
    priceMonthlyCents: 19900,
    priceYearlyCents: 19900 * 10,
    maxLocations: 3,
    monthlyAiResponses: null,
    sources: ["google", "yelp"],
    features: [
      "Everything in Starter",
      "Weekly review report",
      "Competitor review snapshot",
      "Review request automation",
      "Unlimited AI response drafts",
      "Done-with-you setup",
    ],
    yelp: true,
    smsAlerts: true,
    bulkActions: false,
  },
  pro: {
    id: "pro",
    name: "Reputation Guard",
    priceMonthlyCents: 39900,
    priceYearlyCents: 39900 * 10,
    maxLocations: 10,
    monthlyAiResponses: null,
    sources: ["google", "yelp"],
    features: [
      "Everything in Growth",
      "Instant bad-review alerts (SMS)",
      "Priority support",
      "Monthly strategy call",
      "Hands-on response help",
    ],
    yelp: true,
    smsAlerts: true,
    bulkActions: true,
  },
};

export const TRIAL_DAYS = 7;

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLANS as readonly string[]).includes(value);
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return (
    typeof value === "string" &&
    (BILLING_INTERVALS as readonly string[]).includes(value)
  );
}
