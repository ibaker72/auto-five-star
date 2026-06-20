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

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.autofivestar.com"
).replace(/\/$/, "");

// Plain-English read on the score — mirrors scoreBand() on the results page.
function scoreExplanation(score: number): string {
  if (score >= 90) {
    return "Your reputation is a real competitive advantage. The work now is protecting it — keep reviews fresh and replies fast.";
  }
  if (score >= 75) {
    return "You're in good shape, but missed reviews and unanswered replies are leaving trust (and leads) on the table.";
  }
  if (score >= 60) {
    return "Gaps in review volume, recency, or replies are likely making prospects hesitate before they call.";
  }
  return "Customers comparing you to a competitor may be choosing them. This is fixable — usually faster than owners expect.";
}

// Curated punch list — kept in sync with ACTION_ITEMS on the results page.
const ACTION_ITEMS: string[] = [
  "Reply to every unanswered review — replies are public and win back wavering shoppers.",
  "Ask recent happy customers for a review the day of service, while it's fresh.",
  "Flag urgent or negative reviews fast so you can respond before they spread.",
  "Keep reviews coming in every month so your profile always looks active.",
  "Track your weekly review momentum so you know whether trust is improving or slipping.",
  "Use AI drafts to move fast, but approve every reply before it posts.",
];

// "What AutoFiveStar does for you" — mirrors WHAT_WE_DO on the results page.
const WHAT_WE_DO: { title: string; body: string }[] = [
  {
    title: "Drafts replies in your brand voice",
    body: "On-brand responses to every review in seconds — you approve before anything posts.",
  },
  {
    title: "Flags reviews that need urgent attention",
    body: "Negative or time-sensitive reviews get surfaced so nothing slips through.",
  },
  {
    title: "Helps you request more 5-star reviews",
    body: "A steady, automated cadence that asks happy customers at the right moment.",
  },
];

function ctaButton(href: string, label: string, primary: boolean): string {
  const bg = primary ? "#2563eb" : "#ffffff";
  const color = primary ? "#ffffff" : "#2563eb";
  const border = primary ? "#2563eb" : "#c7d2fe";
  return `<a href="${href}" style="display:inline-block; background:${bg}; color:${color};
    border:1px solid ${border}; padding:11px 18px; border-radius:6px;
    text-decoration:none; font-weight:600; font-size:14px; margin:0 6px 8px 0;">${label}</a>`;
}

export async function sendAuditReportEmail(args: {
  to: string;
  businessName: string;
  report: ReputationReport;
  resultsUrl: string;
}): Promise<SendEmailResult> {
  const { report } = args;
  const subject = `Your reputation audit: ${report.score}/100 (Grade ${report.grade})`;

  const li = (xs: string[]) =>
    xs
      .map(
        (x) =>
          `<li style="margin:0 0 6px;">${escapeHtml(x)}</li>`,
      )
      .join("");

  const whatWeDo = WHAT_WE_DO.map(
    (w) => `
      <div style="margin:0 0 12px;">
        <p style="margin:0; font-weight:600; color:#111;">${escapeHtml(w.title)}</p>
        <p style="margin:2px 0 0; color:#555;">${escapeHtml(w.body)}</p>
      </div>`,
  ).join("");

  const startTrialUrl = `${APP_URL}/signup?plan=growth`;
  const bookCallUrl = `${APP_URL}/contact?topic=demo`;
  const pricingUrl = `${APP_URL}/pricing`;

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
      <p style="font-size:14px; color:#666; margin: 0 0 4px;">AutoFiveStar</p>
      <h2 style="margin: 0 0 12px;">Your reputation audit is ready</h2>
      <p>Here's the snapshot for <strong>${escapeHtml(args.businessName)}</strong>.</p>

      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px; color: #666;">Reputation score</p>
        <p style="margin: 4px 0 8px; font-size: 36px; font-weight: 700;">
          ${report.score} <span style="font-size: 16px; color: #666;">/ 100 · Grade ${report.grade}</span>
        </p>
        <p style="margin: 0; color:#555; font-size:14px;">${escapeHtml(scoreExplanation(report.score))}</p>
      </div>

      <h3 style="margin: 20px 0 6px;">What to do next</h3>
      <ol style="margin: 0 0 16px; padding-left: 18px; color:#333;">${li(ACTION_ITEMS)}</ol>

      <h3 style="margin: 20px 0 8px;">What AutoFiveStar does for you</h3>
      ${whatWeDo}

      <div style="margin: 20px 0 8px;">
        ${ctaButton(startTrialUrl, "Start free trial", true)}
        ${ctaButton(bookCallUrl, "Book setup call", false)}
        ${ctaButton(pricingUrl, "See pricing", false)}
      </div>
      <p style="margin: 4px 0 0; font-size:13px;">
        <a href="${args.resultsUrl}" style="color:#2563eb;">View your full audit results &rarr;</a>
      </p>

      <p style="font-size: 12px; color: #888; margin-top: 24px;">
        We built AutoFiveStar to help local business owners respond to and
        request reviews — not to guarantee ratings, rankings, or revenue. You
        approve every reply before it posts.
      </p>
    </div>
  `;

  const text = [
    `Your AutoFiveStar reputation audit for ${args.businessName}`,
    ``,
    `Score: ${report.score}/100 (Grade ${report.grade})`,
    scoreExplanation(report.score),
    ``,
    `What to do next:`,
    ...ACTION_ITEMS.map((a) => `- ${a}`),
    ``,
    `Start free trial: ${startTrialUrl}`,
    `Book setup call: ${bookCallUrl}`,
    `See pricing: ${pricingUrl}`,
    `Full results: ${args.resultsUrl}`,
    ``,
    `We do not guarantee ratings, rankings, or revenue.`,
  ].join("\n");

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
