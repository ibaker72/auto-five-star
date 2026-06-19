import "server-only";
import { sendEmail, type SendEmailResult } from "@/lib/integrations/resend";
import type { ReputationReport } from "./score";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://autofivestar.com";

export async function sendAuditReportEmail(args: {
  to: string;
  businessName: string;
  report: ReputationReport;
  resultsUrl: string;
}): Promise<SendEmailResult> {
  const { report } = args;
  const subject = "Your AutoFiveStar Reputation Audit";

  const items = (xs: string[]) =>
    xs.length === 0
      ? "<li>—</li>"
      : xs.map((x) => `<li>${escapeHtml(x)}</li>`).join("");

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
      <p style="font-size:14px; color:#666; margin: 0 0 4px;">AutoFiveStar</p>
      <h2 style="margin: 0 0 12px;">Your reputation audit is ready</h2>
      <p>Here's the snapshot for <strong>${escapeHtml(args.businessName)}</strong>.</p>
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px; color: #666;">Reputation score</p>
        <p style="margin: 4px 0 0; font-size: 36px; font-weight: 700;">
          ${report.score} <span style="font-size: 16px; color: #666;">/ 100 · ${report.grade}</span>
        </p>
      </div>
      <h3 style="margin: 16px 0 4px;">Strengths</h3>
      <ul style="margin: 0 0 12px; padding-left: 18px;">${items(report.strengths)}</ul>
      <h3 style="margin: 16px 0 4px;">Opportunities</h3>
      <ul style="margin: 0 0 12px; padding-left: 18px;">${items(report.opportunities)}</ul>
      <h3 style="margin: 16px 0 4px;">Recommendations</h3>
      <ul style="margin: 0 0 16px; padding-left: 18px;">${items(report.recommendations)}</ul>
      <p>
        <a href="${args.resultsUrl}"
           style="display:inline-block; background:#2563eb; color:#fff;
                  padding:10px 16px; border-radius:6px; text-decoration:none;">
          View the full audit
        </a>
      </p>
      <p style="font-size: 12px; color: #888; margin-top: 24px;">
        We built AutoFiveStar to help local business owners respond to reviews,
        not to guarantee ratings, rankings, or revenue.
      </p>
    </div>
  `;

  const text = `Your reputation score: ${report.score}/100 (${report.grade}).
Full report: ${args.resultsUrl}`;

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
  return `${APP_URL}/free-audit/results/${requestId}`;
}
