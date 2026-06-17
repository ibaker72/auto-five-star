import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";
import { bootstrapUserOrg } from "@/lib/auth/bootstrap";
import { posthog } from "@/lib/posthog";

/**
 * Supabase Auth callback handler.
 *
 * - For Google OAuth, Supabase redirects here with ?code=...
 * - For email-confirmation links, Supabase redirects here with ?code=...
 * - Exchanges the code for a session, upserts the user row, runs idempotent
 *   org bootstrap, then redirects to ?next= (default /dashboard).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = sanitizeNext(url.searchParams.get("next"));

  if (!code) {
    const back = url.clone();
    back.pathname = "/login";
    back.searchParams.set("error", "Missing OAuth code.");
    return NextResponse.redirect(back);
  }

  const supabase = createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code,
  );
  if (exchangeError) {
    const back = url.clone();
    back.pathname = "/login";
    back.searchParams.set("error", exchangeError.message);
    return NextResponse.redirect(back);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    const back = url.clone();
    back.pathname = "/login";
    back.searchParams.set("error", "No user returned by Supabase.");
    return NextResponse.redirect(back);
  }

  try {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const fullName = typeof meta.full_name === "string" ? meta.full_name : null;
    const result = await bootstrapUserOrg({
      userId: user.id,
      email: user.email,
      fullName,
      avatarUrl:
        typeof meta.avatar_url === "string" ? meta.avatar_url : null,
    });

    posthog.identify({
      distinctId: user.id,
      properties: {
        email: user.email,
        name: fullName ?? undefined,
        org_id: result.org.id,
      },
    });

    if (result.isNewOrg) {
      posthog.capture({
        distinctId: user.id,
        event: "user_signed_up",
        properties: { method: "google_oauth", email: user.email },
      });
    } else {
      posthog.capture({
        distinctId: user.id,
        event: "user_logged_in",
        properties: { method: "google_oauth" },
      });
    }

    const destination =
      next ?? (result.isNewOrg ? "/onboarding" : "/dashboard");
    const dest = url.clone();
    dest.pathname = destination;
    dest.search = "";
    return NextResponse.redirect(dest);
  } catch (err) {
    console.error("[auth/callback] bootstrap failed", err);
    posthog.captureException(err, user.id);
    const back = url.clone();
    back.pathname = "/login";
    back.searchParams.set(
      "error",
      "Could not finish account setup. Please try again.",
    );
    return NextResponse.redirect(back);
  }
}

function sanitizeNext(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
