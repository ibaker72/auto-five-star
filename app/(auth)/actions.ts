"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";
import { authLimiter } from "@/lib/ratelimit";
import { posthog } from "@/lib/posthog";

type ActionResult =
  | { ok: true; message?: string; redirectTo?: string }
  | { ok: false; error: string };

function absoluteCallbackUrl(next?: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL("/auth/callback", base);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

async function checkAuthRateLimit(): Promise<ActionResult | null> {
  try {
    const ip = await clientIp();
    const { success } = await authLimiter.limit(ip);
    if (!success) {
      return {
        ok: false,
        error: "Too many attempts. Try again in a minute.",
      };
    }
  } catch {
    // If Upstash is misconfigured locally, fail open in dev.
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Rate limiter unavailable. Please retry." };
    }
  }
  return null;
}

export async function loginWithPassword(formData: FormData): Promise<ActionResult> {
  const rl = await checkAuthRateLimit();
  if (rl) return rl;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: error.message };
  }

  const userId = signInData.user?.id ?? email;
  posthog.identify({ distinctId: userId, properties: { email } });
  posthog.capture({ distinctId: userId, event: "user_logged_in", properties: { method: "password" } });

  redirect(next);
}

export async function signupWithPassword(
  formData: FormData,
): Promise<ActionResult> {
  const rl = await checkAuthRateLimit();
  if (rl) return rl;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim() || undefined;

  if (!email || password.length < 8) {
    return {
      ok: false,
      error: "Email is required and password must be at least 8 characters.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: absoluteCallbackUrl("/onboarding"),
      data: { full_name: fullName },
    },
  });
  if (error) return { ok: false, error: error.message };

  const userId = data.user?.id ?? email;
  posthog.identify({
    distinctId: userId,
    properties: { email, name: fullName ?? undefined },
  });
  posthog.capture({
    distinctId: userId,
    event: "user_signed_up",
    properties: { method: "password", email },
  });

  // If email confirmation is disabled, signUp returns a session immediately.
  if (data.session) {
    redirect("/onboarding");
  }
  return {
    ok: true,
    message: "Check your email to confirm your account.",
  };
}

export async function loginWithGoogle(formData: FormData): Promise<ActionResult> {
  const next = String(formData.get("next") ?? "/dashboard");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: absoluteCallbackUrl(next),
      scopes: "openid email profile",
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error) return { ok: false, error: error.message };
  if (!data.url) return { ok: false, error: "OAuth URL missing from response." };
  redirect(data.url);
}

export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
