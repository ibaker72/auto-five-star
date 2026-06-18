import { NextResponse, type NextRequest } from "next/server";

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

function hasSupabaseSessionCookie(request: NextRequest): boolean {
  // Supabase stores session fragments as sb-<project-ref>-auth-token(.N)
  // cookies. Presence is enough for proxy-level gating; server code still
  // validates the session with Supabase for protected actions.
  const cookies = request.cookies.getAll();
  return cookies.some(({ name, value }) => {
    if (!name.startsWith("sb-") || !name.includes("-auth-token")) return false;
    if (value === "" || value === "deleted") return false;
    return true;
  });
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });

  const { pathname } = request.nextUrl;
  const isAuthed = hasSupabaseSessionCookie(request);
  const publicRoute = isPublic(pathname);

  if (!isAuthed && !publicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthed && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
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
