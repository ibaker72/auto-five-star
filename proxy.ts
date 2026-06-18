import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC_PATHS = [
  "/",
  "/features",
  "/pricing",
  "/free-audit",
  "/contact",
  "/login",
  "/signup",
  "/forgot-password",
  "/auth/callback",
  "/api/stripe/webhook",
  "/api/inngest",
  "/api/audit",
  "/api/funnel",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Was a Supabase auth-token cookie sent with this request? Used only to decide
 * whether a failed auth check means "stale/broken session" (cookie present but
 * invalid) vs "just not logged in" (no cookie) — NOT to grant access.
 */
function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name, value }) => {
    if (!name.startsWith("sb-") || !name.includes("-auth-token")) return false;
    return value !== "" && value !== "deleted";
  });
}

/**
 * Edge auth + session refresh.
 *
 * Previously this gated purely on the *presence* of an `sb-...-auth-token`
 * cookie. A stale or broken cookie (expired/rotated refresh token) still has a
 * value, so a logged-out-in-practice user was treated as authed: the proxy let
 * them into /dashboard, the server failed to validate the session and bounced
 * to /login, and the proxy bounced them straight back to /dashboard — an
 * infinite redirect loop that surfaced as a blank white page.
 *
 * Now we actually validate the session with Supabase here (which also lets
 * @supabase/ssr persist a freshly rotated cookie, something Server Components
 * cannot do), and on failure we clear the bad cookies and send the user to
 * login instead of trusting a stale token.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicRoute = isPublic(pathname);
  const hasAuthCookie = hasSupabaseAuthCookie(request);

  // Anonymous visitor on a public page: nothing to refresh or guard, skip the
  // Supabase round-trip entirely.
  if (publicRoute && !hasAuthCookie) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Validate against the Auth server. Never trust getSession()/cookie presence.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const isAuthed = !error && !!user;

  // Protected API route without a valid user: don't redirect to an HTML login
  // page — let the handler return its own JSON 401 (it calls requireOrgContext).
  if (!isAuthed && !publicRoute && pathname.startsWith("/api/")) {
    return response;
  }

  // Protected page route without a valid user: clear any stale cookies and
  // redirect to login instead of trusting a stale token.
  if (!isAuthed && !publicRoute) {
    if (error && process.env.NODE_ENV !== "production") {
      console.error(`[proxy] auth check failed for ${pathname}:`, error.message);
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    // Distinguish a broken/expired session from a plain not-logged-in visit.
    if (hasAuthCookie) {
      url.searchParams.set("reason", "session-expired");
    }

    const redirectResponse = NextResponse.redirect(url);
    // Carry over any cookies the refresh attempt produced, then hard-expire the
    // Supabase auth cookies so a broken token can't loop us back here.
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) {
        redirectResponse.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
      }
    }
    return redirectResponse;
  }

  // Logged-in user landing on an auth page: send them to the dashboard. Because
  // a broken session is cleared above (isAuthed === false there), this can only
  // fire for a genuinely valid session, so it can't create a redirect loop.
  if (isAuthed && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
