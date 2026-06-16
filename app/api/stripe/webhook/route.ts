import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/integrations/stripe";
import {
  dispatchStripeEvent,
  markEventProcessed,
} from "@/lib/billing/webhook-events";

export const dynamic = "force-dynamic";
// Stripe signatures sign the raw request body. Use the Node.js runtime so we
// can read the body via request.text() without edge body-stream quirks.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe/webhook] signature verification failed", message);
    return NextResponse.json(
      { error: `Webhook signature failed: ${message}` },
      { status: 400 },
    );
  }

  const fresh = await markEventProcessed(event.id);
  if (!fresh) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await dispatchStripeEvent(event);
  } catch (err) {
    console.error(
      `[stripe/webhook] dispatch failed for event ${event.id} (${event.type})`,
      err,
    );
    // Returning 500 will cause Stripe to retry. We accept that cost in
    // exchange for not silently dropping a billing event.
    return NextResponse.json(
      { error: "Handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
