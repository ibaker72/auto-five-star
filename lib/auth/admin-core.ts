/**
 * Pure admin-allowlist helpers — no `server-only`, no DB, no Supabase. Kept
 * separate from `admin.ts` so the matching logic is trivially unit-testable.
 *
 * Admins are identified by an env-driven email allowlist (`ADMIN_EMAILS`,
 * comma-separated). This is intentionally simple: the internal QA tooling is
 * gated to a handful of known operators, not a full RBAC system.
 */

/** Parse a comma/semicolon/whitespace-separated allowlist into lowercased emails. */
export function parseAdminEmails(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

/** True when `email` is present (case-insensitively) in the allowlist string. */
export function isAdminEmail(
  email: string | null | undefined,
  allowlistRaw: string | null | undefined,
): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0) return false;
  return parseAdminEmails(allowlistRaw).includes(normalized);
}
