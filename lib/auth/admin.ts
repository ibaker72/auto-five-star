import "server-only";
import { getCurrentUser } from "./supabase-server";
import { isAdminEmail } from "./admin-core";

export type AdminUser = { id: string; email: string };

/**
 * Returns the current authenticated user when they're on the admin allowlist
 * (`ADMIN_EMAILS`), otherwise null. Never throws — callers decide how to react
 * (redirect, 404, etc.) so we don't leak the existence of admin surfaces.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const user = await getCurrentUser();
  if (!user?.email) return null;
  if (!isAdminEmail(user.email, process.env.ADMIN_EMAILS)) return null;
  return { id: user.id, email: user.email };
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  return (await getAdminUser()) !== null;
}

export class NotAdminError extends Error {
  constructor() {
    super("FORBIDDEN: admin access required");
    this.name = "NotAdminError";
  }
}

/**
 * Server-action guard. Throws NotAdminError when the caller is not an admin so
 * privileged mutations (run test audit, cleanup) can't run for anyone else.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) throw new NotAdminError();
  return admin;
}
