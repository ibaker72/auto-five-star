/**
 * Pure planning logic for the audit follow-up drip.
 *
 * Decides — given the (possibly stale or missing) lead/request/report loaded at
 * send time — whether a given follow-up step should actually send, and with
 * what content. Kept free of DB/email side effects so the safety rules (missing
 * email, missing lead, missing report) are unit-testable in isolation. The
 * Inngest function calls this and only performs I/O when the plan says "send".
 */
import type { ReputationReport } from "./score";
import type { FollowupEmailArgs, FollowupKey } from "./email-content";

export type FollowupSkipReason =
  | "missing_lead"
  | "missing_request"
  | "missing_report"
  | "missing_email";

export type FollowupPlan =
  | { action: "skip"; reason: FollowupSkipReason }
  | { action: "send"; to: string; key: FollowupKey; content: FollowupEmailArgs };

export type FollowupLeadLike = {
  email: string | null;
  businessName: string;
  googleRating: number | null;
  googleReviewCount: number | null;
};

export type FollowupRequestLike = {
  id: string;
};

/**
 * Returns true only when we have a usable email address to send to. Centralized
 * so both the immediate-send guard and the drip use the same definition.
 */
export function isEmailSendable(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Stable idempotency key for an audit lead's follow-up sequence. The Inngest
 * function dedupes on the lead id (one sequence per lead), but exposing this
 * keeps the rule explicit and testable.
 */
export function followupIdempotencyKey(leadId: string): string {
  return `audit-followup:${leadId}`;
}

export function planFollowupSend(input: {
  key: FollowupKey;
  lead: FollowupLeadLike | null;
  request: FollowupRequestLike | null;
  report: ReputationReport | null;
}): FollowupPlan {
  const { key, lead, request, report } = input;

  if (!lead) return { action: "skip", reason: "missing_lead" };
  if (!request) return { action: "skip", reason: "missing_request" };
  if (!report) return { action: "skip", reason: "missing_report" };
  if (!isEmailSendable(lead.email)) {
    return { action: "skip", reason: "missing_email" };
  }

  return {
    action: "send",
    to: lead.email!.trim(),
    key,
    content: {
      businessName: lead.businessName,
      requestId: request.id,
      report,
      googleRating: lead.googleRating,
      googleReviewCount: lead.googleReviewCount,
    },
  };
}
