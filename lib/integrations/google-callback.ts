import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { exchangeCodeForTokens } from "@/lib/integrations/google";
import { saveGoogleTokens } from "@/lib/integrations/google-tokens";
import { verifyOAuthState } from "@/lib/oauth/state";
import { writeAudit } from "@/lib/audit";

/**
 * Shared handler for the Google Business Profile OAuth callback.
 *
 * Mounted at every redirect URI registered in Google Cloud so that whichever
 * value GOOGLE_REDIRECT_URI points at resolves to a real route instead of a
 * Next.js 404:
 *   - /api/auth/google/callback
 *   - /api/auth/callback/google
 *   - /api/integrations/google/callback (legacy)
 *
 * The token exchange reuses GOOGLE_REDIRECT_URI, so the redirect_uri sent to
 * Google during consent and during the code exchange always match.
 */
function backToLocations(extra: Record<string, string>): NextResponse {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL("/locations", base);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  return NextResponse.redirect(url, { status: 303 });
}

export async function handleGoogleGbpCallback(
  request: NextRequest,
): Promise<NextResponse> {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return backToLocations({ google: "error", message: oauthError });
  }
  if (!code || !stateParam) {
    return backToLocations({
      google: "error",
      message: "Missing code or state from Google.",
    });
  }

  let state;
  try {
    state = verifyOAuthState(stateParam);
  } catch (err) {
    return backToLocations({
      google: "error",
      message: err instanceof Error ? err.message : "Invalid OAuth state.",
    });
  }
  if (state.intent !== "google_gbp") {
    return backToLocations({
      google: "error",
      message: "Unexpected OAuth intent.",
    });
  }

  // Defense in depth: confirm the user driving the flow matches the state.
  const user = await getCurrentUser();
  if (!user || user.id !== state.userId) {
    return backToLocations({
      google: "error",
      message: "Session does not match the connection request.",
    });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await saveGoogleTokens({
      orgId: state.orgId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? null,
      expiresIn: tokens.expiresIn,
      scope: tokens.scope,
      accountEmail: user.email ?? null,
    });
    await writeAudit({
      orgId: state.orgId,
      actorUserId: state.userId,
      action: "integration.connected",
      targetType: "integration",
      targetId: "google",
      metadata: { mode: "live", scope: tokens.scope },
    });
  } catch (err) {
    console.error("[gbp/callback] token exchange failed", err);
    return backToLocations({
      google: "error",
      message: "Could not complete Google connection. Try again.",
    });
  }

  return backToLocations({ google: "connected" });
}
