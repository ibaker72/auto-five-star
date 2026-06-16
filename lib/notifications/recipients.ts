import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orgMembers, users } from "@/lib/db/schema";

export type AlertRecipient = {
  userId: string;
  email: string;
  fullName: string | null;
  notificationPhone: string | null;
  alertsEmailEnabled: boolean;
  alertsSmsEnabled: boolean;
};

/**
 * Owners + admins of the org. The "owner" goes first when there is exactly one.
 */
export async function getOrgAlertRecipients(
  orgId: string,
): Promise<AlertRecipient[]> {
  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
      notificationPhone: users.notificationPhone,
      alertsEmailEnabled: users.alertsEmailEnabled,
      alertsSmsEnabled: users.alertsSmsEnabled,
      role: orgMembers.role,
    })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(
      and(
        eq(orgMembers.orgId, orgId),
        inArray(orgMembers.role, ["owner", "admin"]),
      ),
    );

  return rows
    .map(({ role: _role, ...rest }) => rest)
    .sort((a, b) => a.email.localeCompare(b.email));
}
