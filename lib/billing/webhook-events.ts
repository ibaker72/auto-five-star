import "server-only";
import type Stripe from "stripe";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  organizations,
  subscriptions,
  usageCounters,
  type Subscription,
} from "@/lib/db/schema";
import { Redis } from "@upstash/redis";
import { planFromPriceId } from "@/lib/integrations/stripe";
import { writeAudit } from "@/lib/audit";
import { type Plan } from "./plans";

let _redis: Redis | null = null;
function redis(): Redis | null {
  try {
    if (!_redis) _redis = Redis.fromEnv();
    return _redis;
  } catch {
    return null;
  }
}

/**
 * Returns true if this event has not been processed yet, false otherwise.
 * Best-effort: if Redis is unavailable, treats every event as fresh and
 * relies on the per-event handlers being idempotent.
 */
export async function markEventProcessed(eventId: string): Promise<boolean> {
  const r = redis();
  if (!r) return true;
  const key = `stripe:event:${eventId}`;
  const result = await r.set(key, "1", { nx: true, ex: 86400 });
  return result === "OK";
}

function dateFromUnix(seconds: number | null | undefined): Date | null {
  return typeof seconds === "number" ? new Date(seconds * 1000) : null;
}

async function findOrgIdForSubscription(
  sub: Stripe.Subscription,
): Promise<string | null> {
  const metaOrgId =
    (sub.metadata?.org_id as string | undefined) ??
    ((sub as unknown as { org_id?: string }).org_id);
  if (metaOrgId) return metaOrgId;

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const rows = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.stripeCustomerId, customerId))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function planFromSubscription(
  sub: Stripe.Subscription,
): Promise<{ plan: Plan; priceId: string } | null> {
  const item = sub.items.data[0];
  if (!item) return null;
  const priceId = typeof item.price === "string" ? item.price : item.price.id;
  const lookup = planFromPriceId(priceId);
  if (!lookup) return null;
  return { plan: lookup.plan, priceId };
}

async function ensureCurrentUsageCounter(orgId: string): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  await db
    .insert(usageCounters)
    .values({
      orgId,
      periodStart,
      periodEnd,
      aiResponsesUsed: 0,
      aiCostCents: 0,
      reviewsPulled: 0,
    })
    .onConflictDoNothing();
}

async function upsertSubscription(
  orgId: string,
  sub: Stripe.Subscription,
  plan: Plan,
  priceId: string,
): Promise<Subscription | null> {
  const currentPeriodStart = dateFromUnix(sub.current_period_start);
  const currentPeriodEnd = dateFromUnix(sub.current_period_end);
  const trialEnd = dateFromUnix(sub.trial_end);
  const canceledAt = dateFromUnix(sub.canceled_at);

  const rows = await db
    .insert(subscriptions)
    .values({
      orgId,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      plan,
      status: sub.status,
      currentPeriodStart,
      currentPeriodEnd,
      trialEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      canceledAt,
    })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: {
        stripePriceId: priceId,
        plan,
        status: sub.status,
        currentPeriodStart,
        currentPeriodEnd,
        trialEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
        canceledAt,
        updatedAt: new Date(),
      },
    })
    .returning();

  return rows[0] ?? null;
}

async function updateOrgFromSubscription(
  orgId: string,
  sub: Stripe.Subscription,
  plan: Plan,
): Promise<void> {
  // While the subscription is active or trialing, the org's effective plan
  // mirrors the subscription. On cancellation we drop back to "starter" so
  // entitlements degrade cleanly.
  const effectivePlan: Plan =
    sub.status === "canceled" || sub.status === "incomplete_expired"
      ? "starter"
      : plan;

  const trialEndsAt = dateFromUnix(sub.trial_end);

  await db
    .update(organizations)
    .set({
      plan: effectivePlan,
      trialEndsAt,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId));
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------
export async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const orgId = (session.metadata?.org_id as string | undefined) ?? null;
  if (!orgId) return;

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  if (customerId) {
    // Only fill if missing — never overwrite an existing customer mapping.
    await db
      .update(organizations)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(
        and(
          eq(organizations.id, orgId),
          isNull(organizations.stripeCustomerId),
        ),
      );
  }

  await writeAudit({
    orgId,
    actorUserId: (session.metadata?.user_id as string | undefined) ?? null,
    action: "subscription.created",
    targetType: "checkout_session",
    targetId: session.id,
    metadata: {
      plan: session.metadata?.plan ?? null,
      interval: session.metadata?.interval ?? null,
      status: session.status,
      payment_status: session.payment_status,
    },
  });
}

export async function handleSubscriptionUpsert(
  event: Stripe.Event,
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;
  const orgId = await findOrgIdForSubscription(sub);
  if (!orgId) {
    console.warn("[stripe/webhook] no org for subscription", sub.id);
    return;
  }
  const planLookup = await planFromSubscription(sub);
  if (!planLookup) {
    console.warn("[stripe/webhook] no plan match for sub price", sub.id);
    return;
  }

  await upsertSubscription(orgId, sub, planLookup.plan, planLookup.priceId);
  await updateOrgFromSubscription(orgId, sub, planLookup.plan);
  await ensureCurrentUsageCounter(orgId);

  await writeAudit({
    orgId,
    action:
      event.type === "customer.subscription.created"
        ? "subscription.created"
        : "subscription.updated",
    targetType: "stripe_subscription",
    targetId: sub.id,
    metadata: {
      status: sub.status,
      plan: planLookup.plan,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
    },
  });
}

export async function handleSubscriptionDeleted(
  event: Stripe.Event,
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;
  const orgId = await findOrgIdForSubscription(sub);
  if (!orgId) return;
  const planLookup = await planFromSubscription(sub);

  if (planLookup) {
    await upsertSubscription(
      orgId,
      sub,
      planLookup.plan,
      planLookup.priceId,
    );
  }

  await db
    .update(organizations)
    .set({ plan: "starter", updatedAt: new Date() })
    .where(eq(organizations.id, orgId));

  await writeAudit({
    orgId,
    action: "subscription.canceled",
    targetType: "stripe_subscription",
    targetId: sub.id,
    metadata: { status: sub.status },
  });
}

export async function handleInvoicePaymentSucceeded(
  event: Stripe.Event,
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
  if (!customerId) return;
  const orgRow = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.stripeCustomerId, customerId))
    .limit(1);
  const orgId = orgRow[0]?.id;
  if (!orgId) return;

  await ensureCurrentUsageCounter(orgId);

  await writeAudit({
    orgId,
    action: "subscription.updated",
    targetType: "invoice",
    targetId: invoice.id ?? "unknown",
    metadata: {
      kind: "invoice.payment_succeeded",
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
    },
  });
}

export async function handleInvoicePaymentFailed(
  event: Stripe.Event,
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
  if (!customerId) return;
  const orgRow = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.stripeCustomerId, customerId))
    .limit(1);
  const orgId = orgRow[0]?.id;
  if (!orgId) return;

  await writeAudit({
    orgId,
    action: "subscription.updated",
    targetType: "invoice",
    targetId: invoice.id ?? "unknown",
    metadata: {
      kind: "invoice.payment_failed",
      amount_due: invoice.amount_due,
      currency: invoice.currency,
      attempt_count: invoice.attempt_count,
    },
  });
}

export async function dispatchStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutSessionCompleted(event);
    case "customer.subscription.created":
    case "customer.subscription.updated":
      return handleSubscriptionUpsert(event);
    case "customer.subscription.deleted":
      return handleSubscriptionDeleted(event);
    case "invoice.payment_succeeded":
      return handleInvoicePaymentSucceeded(event);
    case "invoice.payment_failed":
      return handleInvoicePaymentFailed(event);
    default:
      // We accept the event and ignore — Stripe expects a 200 for unknown
      // events too, otherwise it will retry.
      return;
  }
}
