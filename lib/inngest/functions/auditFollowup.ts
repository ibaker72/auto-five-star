import { inngest } from "../client";
import { getAuditByLeadId, extractReport } from "@/lib/audit/leads";
import { sendAuditFollowupEmail } from "@/lib/audit/email";
import { recordFunnelEvent } from "@/lib/analytics/funnel";
import {
  FOLLOWUP_STEPS,
  incrementalDelayDays,
} from "@/lib/audit/email-content";
import { planFollowupSend } from "@/lib/audit/followup-plan";

/**
 * Audit follow-up drip sequence.
 *
 * Triggered once per audit lead (idempotent on lead id, so an accidental
 * double-send of the trigger never produces two sequences). Sleeps between
 * steps and sends a short conversion-focused sequence:
 *   Day 1 — competitor gap
 *   Day 3 — top 3 fixes
 *   Day 5 — final conversion / demo CTA
 *
 * Safety:
 *  - Re-loads the lead at each step; if it's gone or has no email, the step is
 *    skipped (and the rest of the sequence still runs harmlessly).
 *  - A Resend failure is recorded as `audit_email_failed` and does not throw,
 *    so one bad send never aborts the drip.
 */
export const auditFollowupSequence = inngest.createFunction(
  {
    id: "audit-followup-sequence",
    retries: 3,
    concurrency: { limit: 20 },
    // One sequence per lead, even if the trigger event is delivered twice.
    idempotency: "event.data.leadId",
    triggers: { event: "audit/lead.created" },
  },
  async ({ event, step }) => {
    const leadId = event.data.leadId as string;
    const delays = incrementalDelayDays();

    let sent = 0;
    let skipped = 0;

    for (let i = 0; i < FOLLOWUP_STEPS.length; i++) {
      const cfg = FOLLOWUP_STEPS[i]!;
      const delayDays = delays[i] ?? 0;

      // Incremental sleep from the previous step (or from trigger for step 0).
      await step.sleep(cfg.sleepId, `${delayDays}d`);

      const result = await step.run(cfg.sendId, async () => {
        const found = await getAuditByLeadId(leadId);
        const lead = found?.lead ?? null;
        const request = found?.request ?? null;
        const report = request ? extractReport(request).report : null;

        const plan = planFollowupSend({ key: cfg.key, lead, request, report });
        if (plan.action === "skip") {
          console.warn(
            `[audit-followup] skip step=${cfg.key} lead=${leadId} reason=${plan.reason}`,
          );
          return { sent: false as const, reason: plan.reason };
        }

        const res = await sendAuditFollowupEmail({
          to: plan.to,
          key: plan.key,
          content: plan.content,
        });

        await recordFunnelEvent({
          type: res.ok ? "audit_followup_sent" : "audit_email_failed",
          leadId,
          requestId: request!.id,
          metadata: {
            step: cfg.key,
            fixture: res.fixture,
            error: res.error ?? null,
          },
        });

        if (!res.ok) {
          console.error(
            `[audit-followup] send failed step=${cfg.key} lead=${leadId}: ${res.error}`,
          );
        }
        return { sent: res.ok, step: cfg.key };
      });

      if (result.sent) sent++;
      else skipped++;
    }

    return { leadId, sent, skipped };
  },
);
