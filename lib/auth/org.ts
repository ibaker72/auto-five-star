import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  organizations,
  orgMembers,
  type Organization,
  type OrgMember,
} from "@/lib/db/schema";
import { getCurrentUser } from "./supabase-server";

export type CurrentOrgContext = {
  user: { id: string; email: string };
  org: Organization;
  membership: OrgMember;
};

export async function getCurrentUserPrimaryOrg(
  userId: string,
): Promise<{ org: Organization; membership: OrgMember } | null> {
  const rows = await db
    .select({
      org: organizations,
      membership: orgMembers,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(organizations.id, orgMembers.orgId))
    .where(eq(orgMembers.userId, userId))
    .limit(1);

  const row = rows[0];
  return row ? { org: row.org, membership: row.membership } : null;
}

export async function getOrgMembership(
  userId: string,
  orgId: string,
): Promise<OrgMember | null> {
  const rows = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, userId), eq(orgMembers.orgId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Returns the current authenticated user and their primary org membership.
 * Returns null when unauthenticated or when the user has no org yet.
 */
export async function getCurrentOrgContext(): Promise<CurrentOrgContext | null> {
  const user = await getCurrentUser();
  if (!user?.email) return null;
  const primary = await getCurrentUserPrimaryOrg(user.id);
  if (!primary) return null;
  return {
    user: { id: user.id, email: user.email },
    org: primary.org,
    membership: primary.membership,
  };
}

export async function requireOrgContext(): Promise<CurrentOrgContext> {
  const ctx = await getCurrentOrgContext();
  if (!ctx) throw new Error("UNAUTHORIZED: no org context");
  return ctx;
}
