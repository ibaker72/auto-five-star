export const PLANS = ["starter", "growth", "pro"] as const;
export type Plan = (typeof PLANS)[number];

export type PlanConfig = {
  id: Plan;
  name: string;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  maxLocations: number;
  monthlyAiResponses: number | "unlimited";
  sources: Array<"google" | "yelp">;
  features: string[];
  smsAlerts: boolean;
};

export const PLAN_CONFIG: Record<Plan, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthlyCents: 4900,
    priceYearlyCents: 49_00 * 10, // 2 months free
    maxLocations: 1,
    monthlyAiResponses: 50,
    sources: ["google"],
    features: [
      "1 location",
      "50 AI responses / month",
      "Google reviews",
      "Email alerts",
    ],
    smsAlerts: false,
  },
  growth: {
    id: "growth",
    name: "Growth",
    priceMonthlyCents: 9900,
    priceYearlyCents: 99_00 * 10,
    maxLocations: 3,
    monthlyAiResponses: "unlimited",
    sources: ["google", "yelp"],
    features: [
      "3 locations",
      "Unlimited AI responses",
      "Google + Yelp (read-only)",
      "Competitor snapshot",
      "SMS alerts",
    ],
    smsAlerts: true,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyCents: 19900,
    priceYearlyCents: 199_00 * 10,
    maxLocations: 10,
    monthlyAiResponses: "unlimited",
    sources: ["google", "yelp"],
    features: [
      "10 locations",
      "Unlimited AI responses",
      "White-label / agency mode",
      "API access",
      "Bulk operations",
      "Priority support",
    ],
    smsAlerts: true,
  },
};

export const TRIAL_DAYS = 14;
