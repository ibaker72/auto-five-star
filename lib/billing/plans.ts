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
    priceMonthlyCents: 4900,
    priceYearlyCents: 4900 * 10, // 2 months free
    maxLocations: 1,
    monthlyAiResponses: 50,
    sources: ["google"],
    features: [
      "1 location",
      "50 AI responses / month",
      "Google reviews",
      "Email alerts",
    ],
    yelp: false,
    smsAlerts: false,
    bulkActions: false,
  },
  growth: {
    id: "growth",
    name: "Growth",
    priceMonthlyCents: 9900,
    priceYearlyCents: 9900 * 10,
    maxLocations: 3,
    monthlyAiResponses: null,
    sources: ["google", "yelp"],
    features: [
      "3 locations",
      "Unlimited AI responses",
      "Google + Yelp (read-only)",
      "Competitor snapshot",
      "SMS alerts",
    ],
    yelp: true,
    smsAlerts: true,
    bulkActions: false,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyCents: 19900,
    priceYearlyCents: 19900 * 10,
    maxLocations: 10,
    monthlyAiResponses: null,
    sources: ["google", "yelp"],
    features: [
      "10 locations",
      "Unlimited AI responses",
      "White-label / agency mode",
      "API access",
      "Bulk operations",
      "Priority support",
    ],
    yelp: true,
    smsAlerts: true,
    bulkActions: true,
  },
};

export const TRIAL_DAYS = 14;

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLANS as readonly string[]).includes(value);
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return (
    typeof value === "string" &&
    (BILLING_INTERVALS as readonly string[]).includes(value)
  );
}
