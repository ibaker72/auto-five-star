import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createBareClient } from "@supabase/supabase-js";
import type { AuthError, User } from "@supabase/supabase-js";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component — middleware refreshes the
            // session cookie on the next request, so this is non-fatal.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // see above
          }
        },
      },
    },
  );
}

/** Privileged client for service-role operations (webhooks, jobs). */
export function createSupabaseServiceClient() {
  return createBareClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export type AuthUserResult = {
  user: User | null;
  /**
   * Set when Supabase returned an auth/session error (e.g. an expired or
   * already-rotated refresh token). When this is set the cookie is stale or
   * broken and the caller should clear the session and send the user to login.
   */
  error: AuthError | null;
};

/**
 * Validate the current user against the Supabase Auth server.
 *
 * Always uses `getUser()` (which verifies the JWT with Supabase) rather than
 * `getSession()` (which trusts whatever is in the cookie). Returns both the
 * user and any auth error so callers can distinguish "logged out" from
 * "broken/stale session" and react appropriately.
 */
export async function getAuthenticatedUser(): Promise<AuthUserResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && process.env.NODE_ENV !== "production") {
    console.error("[auth] getUser failed:", error.message);
  }

  return { user, error };
}

/**
 * Backwards-compatible convenience wrapper used across pages, layouts and API
 * routes. Returns the validated user or null. On an auth error it logs in dev
 * and returns null so protected surfaces treat a broken session as logged out.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { user } = await getAuthenticatedUser();
  return user;
}

/**
 * Best-effort sign out that clears the Supabase auth cookies for the current
 * request. Safe to call from Server Actions / Route Handlers (where cookie
 * writes are permitted). Never throws.
 */
export async function clearServerSession(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth] clearServerSession failed:", err);
    }
  }
}
