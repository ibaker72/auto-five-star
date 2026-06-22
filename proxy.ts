import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Public page + API routes (and their subpaths) that must always render without
 * authentication. "/" is matched exactly (handled in isPublicRoute) so it never
 * acts as a catch-all prefix.
 */
const PUBLIC_PREFIXES = [
  "/features",
  "/pricing",
  "/free-audit",
  "/contact",
  "/terms",
  "/privacy",
  "/login",
  "/signup",
  "/forgot-password",
  "/auth", // /auth/callback and any other auth sub-route
  "/monitoring", // Sentry tunnelRoute (see next.config.mjs)
  // PWA / branding assets that must load without auth (manifest, app icons,
  // social cards). Most resolve to extension paths excluded by the matcher
  // below, but the dynamic /icons/* PNG routes have no extension, so list them.
  "/icons",
  "/opengraph-image",
  "/twitter-image",
  "/apple-icon",
  "/apple-touch-icon",
  // Public review-request click tracker — recipients are not logged in.
  "/r",
  // Unauthenticated API endpoints (webhooks, ingestion, public lookups):
  "/api/stripe/webhook",
  "/api/inngest",
  "/api/audit",
  "/api/funnel",
];

/**
 * Well-known static / SEO files that are always public, independent of the
 * prefix list. Most are already excluded by the matcher below, but this keeps
 * the auth logic correct even if the matcher changes.
 */
const PUBLIC_FILE =
  /^\/(robots\.txt|sitemap\.xml|manifest\.webmanifest|favicon\.ico|.*\.(?:png|jpe?g|gif|webp|avif|svg|ico|txt|xml|woff2?|ttf|map))$/;

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  if (PUBLIC_FILE.test(pathname)) return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
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

/** Expire any Supabase auth cookies on the given response. */
function clearSupabaseCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  }
}

/**
 * Edge auth + Supabase session refresh.
 *
 * Invariants:
 * - Public routes (marketing, /login, /auth/callback, static/SEO files) always
 *   render. The proxy never returns 403 and never blocks anonymous visitors —
 *   "/" in particular is always allowed.
 * - On protected *pages* without a valid user, redirect to
 *   /login?reason=session-expired (never 403), clearing any stale cookies.
 * - On protected *API* routes, fall through so the handler returns its own JSON
 *   401/403 instead of an HTML redirect.
 * - A broken/stale auth cookie is validated against Supabase (which also lets
 *   @supabase/ssr persist a freshly rotated cookie) and cleared on failure, so
 *   a stale token can't loop /login <-> /dashboard or leave the user stuck.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicRoute = isPublicRoute(pathname);
  const hasAuthCookie = hasSupabaseAuthCookie(request);

  // Fast path: anonymous visitor on a public route. Nothing to refresh or
  // guard — never call Supabase, never block. Guarantees marketing pages load.
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
  // Any failure here must degrade to "not authenticated", never to a hard block.
  let isAuthed = false;
  let authErrored = false;
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    isAuthed = !error && !!user;
    authErrored = !!error;
    if (error && process.env.NODE_ENV !== "production") {
      console.error(`[proxy] auth check failed for ${pathname}:`, error.message);
    }
  } catch (err) {
    authErrored = true;
    if (process.env.NODE_ENV !== "production") {
      console.error(`[proxy] getUser threw for ${pathname}:`, err);
    }
  }

  // Public route: always allow it to render. Clear a broken cookie if present,
  // but never redirect/block a public page on an auth failure.
  if (publicRoute) {
    if (!isAuthed && hasAuthCookie) {
      clearSupabaseCookies(request, response);
    }
    // Logged-in user on an auth page: send them to the dashboard. Only fires
    // for a genuinely valid session, so it can't create a redirect loop.
    if (isAuthed && (pathname === "/login" || pathname === "/signup")) {
      const dest = request.nextUrl.clone();
      dest.pathname = "/dashboard";
      dest.search = "";
      return NextResponse.redirect(dest);
    }
    return response;
  }

  // --- Protected route below ---

  // Protected API route: let the handler return its own JSON 401/403.
  if (pathname.startsWith("/api/")) {
    return response;
  }

  // Protected page with a valid user: allow.
  if (isAuthed) {
    return response;
  }

  // Protected page without a valid user: clear stale cookies and redirect to
  // login (never 403).
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", pathname);
  if (hasAuthCookie || authErrored) {
    loginUrl.searchParams.set("reason", "session-expired");
  }
  const redirectResponse = NextResponse.redirect(loginUrl);
  clearSupabaseCookies(request, redirectResponse);
  return redirectResponse;
}

export const config = {
  matcher: [
    /*
     * Run on everything except Next internals, static assets and well-known
     * SEO/monitoring files. Those are public and must never hit auth logic.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|monitoring|.*\\.(?:svg|png|jpe?g|gif|webp|avif|ico|txt|xml|woff2?|ttf|map)$).*)",
  ],
};
