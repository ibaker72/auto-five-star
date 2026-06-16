import { db } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";

export type AuditAction =
  | "org.created"
  | "org.member.added"
  | "org.member.removed"
  | "subscription.created"
  | "subscription.updated"
  | "subscription.canceled"
  | "integration.connected"
  | "integration.disconnected"
  | "location.connected"
  | "location.disconnected"
  | "review.synced"
  | "reviews.pulled"
  | "reviews.poll.started"
  | "reviews.poll.completed"
  | "reviews.poll.failed"
  | "draft.generated"
  | "draft.edited"
  | "response.approved"
  | "response.posted"
  | "response.failed"
  | "review.skipped"
  | "review.flagged";

export async function writeAudit(params: {
  orgId: string;
  actorUserId?: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    orgId: params.orgId,
    actorUserId: params.actorUserId ?? null,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    metadata: params.metadata ?? {},
  });
}
