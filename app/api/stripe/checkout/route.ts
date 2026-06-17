import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { getCurrentUserPrimaryOrg } from "@/lib/auth/org";
import { db } from "@/lib/db/client";
import { organizations } from "@/lib/db/schema";
import {
  createCheckoutSession,
  createCustomer,
  priceIdFor,
  StripeConfigError,
} from "@/lib/integrations/stripe";
import {
  isBillingInterval,
  isPlan,
  TRIAL_DAYS,
} from "@/lib/billing/plans";
import { writeAudit } from "@/lib/audit";
import { posthog } from "@/lib/posthog";

export const dynamic = "force-dynamic";

function backToBilling(message: string): NextResponse {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL("/billing", base);
  url.searchParams.set("checkout", "error");
  url.searchParams.set("message", message);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let plan: string | null = null;
  let interval: string | null = null;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as
      | { plan?: string; interval?: string }
      | null;
    plan = body?.plan ?? null;
    interval = body?.interval ?? null;
  } else {
    const form = await request.formData();
    plan = String(form.get("plan") ?? "");
    interval = String(form.get("interval") ?? "");
  }

  if (!isPlan(plan) || !isBillingInterval(interval)) {
    return backToBilling("Invalid plan or billing interval.");
  }

  const primary = await getCurrentUserPrimaryOrg(user.id);
  if (!primary) {
    return NextResponse.json(
      { error: "No organization for current user." },
      { status: 400 },
    );
  }
  const org = primary.org;

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    try {
      const customer = await createCustomer({
        email: user.email,
        orgId: org.id,
        name: org.name,
      });
      customerId = customer.id;
      await db
        .update(organizations)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(organizations.id, org.id));
    } catch (err) {
      console.error("[stripe/checkout] customer creation failed", err);
      return backToBilling("Could not create Stripe customer. Try again.");
    }
  }

  let priceId: string;
  try {
    priceId = priceIdFor(plan, interval);
  } catch (err) {
    if (err instanceof StripeConfigError) {
      return backToBilling(err.message);
    }
    throw err;
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const session = await createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${base}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${base}/billing?checkout=cancelled`,
      orgId: org.id,
      userId: user.id,
      plan,
      interval,
      trialDays: TRIAL_DAYS,
    });

    await writeAudit({
      orgId: org.id,
      actorUserId: user.id,
      action: "subscription.created",
      targetType: "checkout_session",
      targetId: session.id,
      metadata: { plan, interval, status: "session_created" },
    });

    posthog.capture({
      distinctId: user.id,
      event: "subscription_checkout_started",
      properties: { org_id: org.id, plan, interval, trial_days: TRIAL_DAYS },
    });

    if (!session.url) {
      return backToBilling("Stripe did not return a session URL.");
    }
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err) {
    console.error("[stripe/checkout] session creation failed", err);
    return backToBilling("Could not start checkout. Try again.");
  }
}
