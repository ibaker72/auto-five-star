import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { getCurrentUserPrimaryOrg } from "@/lib/auth/org";
import { buildAuthUrl } from "@/lib/integrations/google";
import { saveGoogleTokens } from "@/lib/integrations/google-tokens";
import { signOAuthState } from "@/lib/oauth/state";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LIVE = process.env.GBP_LIVE === "true";

function backToLocations(extra: Record<string, string>): NextResponse {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL("/locations", base);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  return NextResponse.redirect(url, { status: 303 });
}

/**
 * Start the Google Business Profile OAuth flow.
 *
 * - GBP_LIVE=true  → redirect the user to Google with a signed state token.
 * - GBP_LIVE=false → skip Google entirely and persist fixture tokens so the
 *                    rest of the app behaves as if connected. This keeps dev
 *                    and demo working until the production OAuth client gets
 *                    `business.manage` approved.
 */
async function startConnect(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const primary = await getCurrentUserPrimaryOrg(user.id);
  if (!primary) {
    return backToLocations({
      google: "error",
      message: "Set up your workspace first.",
    });
  }

  if (!LIVE) {
    // Persist a synthetic encrypted token row, then redirect.
    try {
      await saveGoogleTokens({
        orgId: primary.org.id,
        accessToken: `fixture-access-${Date.now()}`,
        refreshToken: "fixture-refresh-token",
        expiresIn: 60 * 60 * 24 * 365, // 1 year so fixture mode never expires
        scope: "https://www.googleapis.com/auth/business.manage",
        accountEmail: user.email,
      });
      await writeAudit({
        orgId: primary.org.id,
        actorUserId: user.id,
        action: "integration.connected",
        targetType: "integration",
        targetId: "google",
        metadata: { mode: "fixture" },
      });
    } catch (err) {
      console.error("[gbp/connect] fixture save failed", err);
      return backToLocations({
        google: "error",
        message: "Could not save the demo connection. Check ENCRYPTION_KEY.",
      });
    }
    return backToLocations({ google: "connected" });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    return backToLocations({
      google: "error",
      message:
        "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI.",
    });
  }

  const state = signOAuthState({
    intent: "google_gbp",
    orgId: primary.org.id,
    userId: user.id,
  });
  return NextResponse.redirect(buildAuthUrl(state), { status: 303 });
}

export async function GET(_request: NextRequest) {
  return startConnect();
}

export async function POST(_request: NextRequest) {
  return startConnect();
}
