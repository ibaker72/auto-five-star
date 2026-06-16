import Stripe from "stripe";
import type { Plan } from "@/lib/billing/plans";

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is required");
    _stripe = new Stripe(key, {
      apiVersion: "2024-06-20",
      typescript: true,
      maxNetworkRetries: 2,
    });
  }
  return _stripe;
}

const PRICE_ENV: Record<Plan, { monthly: string; yearly: string }> = {
  starter: {
    monthly: "STRIPE_PRICE_STARTER_MONTHLY",
    yearly: "STRIPE_PRICE_STARTER_YEARLY",
  },
  growth: {
    monthly: "STRIPE_PRICE_GROWTH_MONTHLY",
    yearly: "STRIPE_PRICE_GROWTH_YEARLY",
  },
  pro: {
    monthly: "STRIPE_PRICE_PRO_MONTHLY",
    yearly: "STRIPE_PRICE_PRO_YEARLY",
  },
};

export function priceIdFor(plan: Plan, cycle: "monthly" | "yearly"): string {
  const key = PRICE_ENV[plan][cycle];
  const value = process.env[key];
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
}

export function planFromPriceId(priceId: string): Plan | null {
  for (const plan of ["starter", "growth", "pro"] as const) {
    for (const cycle of ["monthly", "yearly"] as const) {
      if (process.env[PRICE_ENV[plan][cycle]] === priceId) return plan;
    }
  }
  return null;
}

export async function createCustomer(params: {
  email: string;
  name?: string;
  orgId: string;
}): Promise<Stripe.Customer> {
  return stripe().customers.create({
    email: params.email,
    name: params.name,
    metadata: { org_id: params.orgId },
  });
}

export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  orgId: string;
  trialDays?: number;
}): Promise<Stripe.Checkout.Session> {
  return stripe().checkout.sessions.create({
    mode: "subscription",
    customer: params.customerId,
    line_items: [{ price: params.priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: params.trialDays ?? 14,
      metadata: { org_id: params.orgId },
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { org_id: params.orgId },
    allow_promotion_codes: true,
  });
}

export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  return stripe().billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });
}
