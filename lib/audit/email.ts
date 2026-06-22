import "server-only";
import { sendEmail, type SendEmailResult } from "@/lib/integrations/resend";
import type { ReputationReport } from "./score";
import {
  APP_URL,
  buildAuditReportEmail,
  buildFollowupEmail,
  resultsUrl as buildResultsUrlInternal,
  type FollowupEmailArgs,
  type FollowupKey,
} from "./email-content";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Immediate "your audit is ready" email. Includes the score, top issues, a
 * competitor comparison (when available), a link to the full results page, and
 * a link to download the PDF report. Never throws — returns a SendEmailResult
 * so the caller can record the outcome as a funnel event.
 */
export async function sendAuditReportEmail(args: {
  to: string;
  businessName: string;
  requestId: string;
  report: ReputationReport;
  googleRating?: number | null;
  googleReviewCount?: number | null;
}): Promise<SendEmailResult> {
  const { subject, html, text } = buildAuditReportEmail({
    businessName: args.businessName,
    requestId: args.requestId,
    report: args.report,
    googleRating: args.googleRating,
    googleReviewCount: args.googleReviewCount,
  });
  return sendEmail({ to: args.to, subject, html, text });
}

/**
 * Send one step of the audit follow-up drip. Pure content comes from
 * email-content.ts; this wrapper just dispatches via Resend.
 */
export async function sendAuditFollowupEmail(args: {
  to: string;
  key: FollowupKey;
  content: FollowupEmailArgs;
}): Promise<SendEmailResult> {
  const { subject, html, text } = buildFollowupEmail(args.key, args.content);
  return sendEmail({ to: args.to, subject, html, text });
}

export async function sendAuditLeadNotification(args: {
  businessName: string;
  email: string;
  website: string | null;
  gbpUrl: string | null;
  industry: string | null;
  city?: string | null;
  phone?: string | null;
  score: number;
  resultsUrl: string;
}): Promise<SendEmailResult | null> {
  const supportEmail =
    process.env.SUPPORT_EMAIL ?? "support@autofivestar.com";
  if (!supportEmail) return null;

  const subject = `New audit lead — ${args.businessName} (${args.score}/100)`;
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px;">
      <h2 style="margin: 0 0 12px;">New free-audit lead</h2>
      <p><strong>${escapeHtml(args.businessName)}</strong> just ran a reputation audit.</p>
      <ul>
        <li>Email: ${escapeHtml(args.email)}</li>
        <li>Phone: ${args.phone ? escapeHtml(args.phone) : "—"}</li>
        <li>City: ${args.city ? escapeHtml(args.city) : "—"}</li>
        <li>Website: ${args.website ? escapeHtml(args.website) : "—"}</li>
        <li>GBP URL: ${args.gbpUrl ? escapeHtml(args.gbpUrl) : "—"}</li>
        <li>Industry: ${args.industry ? escapeHtml(args.industry) : "—"}</li>
        <li>Score: ${args.score}/100</li>
      </ul>
      <p>
        <a href="${args.resultsUrl}">Open results page</a>
      </p>
    </div>
  `;
  const text = `New audit lead: ${args.businessName} (${args.email}). Score ${args.score}/100. ${args.resultsUrl}`;
  return sendEmail({ to: supportEmail, subject, html, text });
}

export function buildResultsUrl(requestId: string): string {
  return buildResultsUrlInternal(requestId);
}

export { APP_URL };
