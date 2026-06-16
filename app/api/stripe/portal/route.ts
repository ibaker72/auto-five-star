import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { getCurrentUserPrimaryOrg } from "@/lib/auth/org";
import { createPortalSession } from "@/lib/integrations/stripe";

export const dynamic = "force-dynamic";

function backToBilling(message: string): NextResponse {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL("/billing", base);
  url.searchParams.set("portal", "error");
  url.searchParams.set("message", message);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(_request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const primary = await getCurrentUserPrimaryOrg(user.id);
  if (!primary) {
    return backToBilling("No organization on this account.");
  }
  if (!primary.org.stripeCustomerId) {
    return backToBilling(
      "No Stripe customer for this organization yet. Start a subscription first.",
    );
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const session = await createPortalSession({
      customerId: primary.org.stripeCustomerId,
      returnUrl: `${base}/billing`,
    });
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err) {
    console.error("[stripe/portal] session creation failed", err);
    return backToBilling("Could not open billing portal. Try again.");
  }
}
