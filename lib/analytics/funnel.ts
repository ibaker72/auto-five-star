import "server-only";
import { db } from "@/lib/db/client";
import { funnelEvents } from "@/lib/db/schema";

export const FUNNEL_EVENT_TYPES = [
  "audit_started",
  "audit_completed",
  "audit_email_sent",
  "audit_email_failed",
  "trial_clicked",
  "demo_clicked",
  "contact_clicked",
  "pricing_viewed",
  "features_viewed",
] as const;

export type FunnelEventType = (typeof FUNNEL_EVENT_TYPES)[number];

export function isFunnelEventType(value: unknown): value is FunnelEventType {
  return (
    typeof value === "string" &&
    (FUNNEL_EVENT_TYPES as readonly string[]).includes(value)
  );
}

export type RecordFunnelEventInput = {
  type: FunnelEventType;
  leadId?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Record a single funnel event. Best-effort: a failure here never bubbles up
 * to the user because we don't want a logging error to break the funnel.
 */
export async function recordFunnelEvent(
  input: RecordFunnelEventInput,
): Promise<void> {
  try {
    await db.insert(funnelEvents).values({
      eventType: input.type,
      auditLeadId: input.leadId ?? null,
      auditRequestId: input.requestId ?? null,
      sessionId: input.sessionId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    console.error("[funnel] record failed", input.type, err);
  }
}
