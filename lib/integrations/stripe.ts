import Stripe from "stripe";
import type { BillingInterval, Plan } from "@/lib/billing/plans";

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

const PRICE_ENV: Record<Plan, Record<BillingInterval, string>> = {
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

export class StripeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeConfigError";
  }
}

export function priceIdFor(plan: Plan, interval: BillingInterval): string {
  const key = PRICE_ENV[plan][interval];
  const value = process.env[key];
  if (!value) {
    throw new StripeConfigError(
      `Stripe price env var ${key} is not set. Create the price in Stripe and add it to .env.local.`,
    );
  }
  return value;
}

export function planFromPriceId(
  priceId: string,
): { plan: Plan; interval: BillingInterval } | null {
  for (const plan of ["starter", "growth", "pro"] as const) {
    for (const interval of ["monthly", "yearly"] as const) {
      if (process.env[PRICE_ENV[plan][interval]] === priceId) {
        return { plan, interval };
      }
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
  userId: string;
  plan: Plan;
  interval: BillingInterval;
  trialDays?: number;
}): Promise<Stripe.Checkout.Session> {
  const metadata = {
    org_id: params.orgId,
    user_id: params.userId,
    plan: params.plan,
    interval: params.interval,
  };
  return stripe().checkout.sessions.create({
    mode: "subscription",
    customer: params.customerId,
    line_items: [{ price: params.priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: params.trialDays ?? 14,
      metadata,
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata,
    allow_promotion_codes: true,
    payment_method_collection: "always",
    billing_address_collection: "auto",
    automatic_tax: { enabled: false },
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
