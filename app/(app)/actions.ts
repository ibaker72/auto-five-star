"use server";

import { redirect } from "next/navigation";
import { clearServerSession } from "@/lib/auth/supabase-server";

/**
 * Clear the current Supabase session/cookies and return to login. Used by the
 * dashboard error fallback so a user stuck behind a broken session can recover
 * without manually deleting cookies.
 */
export async function signOutAndReturnToLogin(): Promise<void> {
  await clearServerSession();
  redirect("/login?reason=signed-out");
}
