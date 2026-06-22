/**
 * Pure audit email content builders.
 *
 * No side effects, no `server-only`, no Resend — every export here is a pure
 * function that returns an { subject, html, text } payload (or a small config
 * value). This keeps the copy/rendering unit-testable in isolation and lets
 * both the inline send path (lib/audit/email.ts) and the Inngest follow-up
 * sequence (lib/inngest/functions/auditFollowup.ts) share one source of truth.
 */
import type { CompetitorComparison, ReputationReport } from "./score";

export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.autofivestar.com"
).replace(/\/$/, "");

export type EmailPayload = {
  subject: string;
  html: string;
  text: string;
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

export function resultsUrl(requestId: string): string {
  return `${APP_URL}/free-audit/results/${requestId}`;
}

export function pdfUrl(requestId: string): string {
  return `${APP_URL}/api/audit/${requestId}/pdf`;
}

export const startTrialUrl = `${APP_URL}/signup?plan=growth`;
export const bookDemoUrl = `${APP_URL}/contact?topic=demo`;
export const pricingUrl = `${APP_URL}/pricing`;
export const privacyUrl = `${APP_URL}/privacy`;

// ---------------------------------------------------------------------------
// Shared chrome
// ---------------------------------------------------------------------------

function ctaButton(href: string, label: string, primary: boolean): string {
  const bg = primary ? "#2563eb" : "#ffffff";
  const color = primary ? "#ffffff" : "#2563eb";
  const border = primary ? "#2563eb" : "#c7d2fe";
  return `<a href="${href}" style="display:inline-block; background:${bg}; color:${color};
    border:1px solid ${border}; padding:11px 18px; border-radius:6px;
    text-decoration:none; font-weight:600; font-size:14px; margin:0 6px 8px 0;">${label}</a>`;
}

/** Standard trial + demo CTA pair used across every audit email. */
export function ctaRow(): string {
  return `<div style="margin: 20px 0 8px;">
    ${ctaButton(startTrialUrl, "Start 7-day free trial", true)}
    ${ctaButton(bookDemoUrl, "Book a demo", false)}
  </div>`;
}

/**
 * Footer with lightweight opt-out copy. There's no dedicated suppression list
 * in the product yet, so we keep it simple and CAN-SPAM-friendly: a real
 * reply-to address the prospect can use to opt out, plus a privacy link.
 */
export function footer(): string {
  return `
    <p style="font-size: 12px; color: #888; margin-top: 24px; line-height:1.5;">
      We built AutoFiveStar to help local business owners respond to and request
      reviews — not to guarantee ratings, rankings, or revenue. You approve every
      reply before it posts.
    </p>
    <p style="font-size: 11px; color: #999; margin-top: 12px; line-height:1.5;">
      You're receiving this because you ran a free reputation audit at
      autofivestar.com. Not interested? Just reply with "unsubscribe" and we'll
      stop these emails. ·
      <a href="${privacyUrl}" style="color:#999;">Privacy</a>
    </p>`;
}

function layout(bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
      <p style="font-size:14px; color:#2563eb; font-weight:600; margin: 0 0 4px;">AutoFiveStar</p>
      ${bodyHtml}
      ${footer()}
    </div>`;
}

// Plain-English read on the score — mirrors scoreBand() on the results page.
export function scoreExplanation(score: number): string {
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

function scoreCard(score: number, grade: string): string {
  return `
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: #666;">Reputation score</p>
      <p style="margin: 4px 0 8px; font-size: 36px; font-weight: 700;">
        ${score} <span style="font-size: 16px; color: #666;">/ 100 · Grade ${grade}</span>
      </p>
      <p style="margin: 0; color:#555; font-size:14px;">${escapeHtml(scoreExplanation(score))}</p>
    </div>`;
}

/**
 * Competitor comparison table for emails. Returns "" when there's nothing
 * meaningful to show (no competitors found), so callers can safely inline it.
 */
export function competitorTableHtml(args: {
  businessName: string;
  yourRating: number | null;
  yourReviewCount: number | null;
  comparison: CompetitorComparison | undefined;
}): string {
  const { comparison } = args;
  if (!comparison || comparison.competitors.length === 0) return "";

  const fmtRating = (r: number | null) => (r !== null ? r.toFixed(1) : "—");
  const fmtCount = (c: number | null) =>
    c !== null ? c.toLocaleString() : "—";

  const youRow = `
    <tr style="font-weight:600; color:#2563eb;">
      <td style="padding:6px 8px; border-bottom:1px solid #eee;">${escapeHtml(args.businessName)} (you)</td>
      <td style="padding:6px 8px; border-bottom:1px solid #eee;">${fmtRating(args.yourRating)}</td>
      <td style="padding:6px 8px; border-bottom:1px solid #eee;">${fmtCount(args.yourReviewCount)}</td>
    </tr>`;

  const competitorRows = comparison.competitors
    .map(
      (c) => `
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #eee; color:#333;">${escapeHtml(c.name)}</td>
        <td style="padding:6px 8px; border-bottom:1px solid #eee; color:#333;">${fmtRating(c.rating)}</td>
        <td style="padding:6px 8px; border-bottom:1px solid #eee; color:#333;">${fmtCount(c.reviewCount)}</td>
      </tr>`,
    )
    .join("");

  return `
    <table style="width:100%; border-collapse:collapse; margin:12px 0; font-size:13px;">
      <thead>
        <tr style="text-align:left; color:#888; font-size:12px;">
          <th style="padding:6px 8px;">Business</th>
          <th style="padding:6px 8px;">Rating</th>
          <th style="padding:6px 8px;">Reviews</th>
        </tr>
      </thead>
      <tbody>
        ${youRow}
        ${competitorRows}
      </tbody>
    </table>`;
}

/** One-line summary of how the business sits vs. the local average. */
export function competitorGapSummary(
  comparison: CompetitorComparison | undefined,
): string | null {
  if (!comparison || comparison.ratingGap === null) return null;
  if (comparison.ratingGap >= 0) {
    return `You're ahead of the local average by ${comparison.ratingGap.toFixed(1)} stars. Keep it up by staying responsive and asking for fresh reviews.`;
  }
  return `You're ${Math.abs(comparison.ratingGap).toFixed(1)} stars behind the local average — closing that gap is exactly what AutoFiveStar is built for.`;
}

// ---------------------------------------------------------------------------
// 1) Immediate audit report email
// ---------------------------------------------------------------------------

export type AuditReportEmailArgs = {
  businessName: string;
  requestId: string;
  report: ReputationReport;
  googleRating?: number | null;
  googleReviewCount?: number | null;
};

export function buildAuditReportEmail(
  args: AuditReportEmailArgs,
): EmailPayload {
  const { report, businessName, requestId } = args;
  const subject = "Your Google Reputation Audit is ready";

  const topIssues = report.opportunities.slice(0, 3);
  const issuesHtml =
    topIssues.length > 0
      ? `<h3 style="margin: 20px 0 6px;">Top issues we found</h3>
         <ul style="margin: 0 0 16px; padding-left: 18px; color:#333;">
           ${topIssues.map((x) => `<li style="margin:0 0 6px;">${escapeHtml(x)}</li>`).join("")}
         </ul>`
      : "";

  const table = competitorTableHtml({
    businessName,
    yourRating: args.googleRating ?? null,
    yourReviewCount: args.googleReviewCount ?? null,
    comparison: report.competitors,
  });
  const gap = competitorGapSummary(report.competitors);
  const competitorHtml = table
    ? `<h3 style="margin: 20px 0 6px;">How you compare</h3>
       ${table}
       ${gap ? `<p style="margin:4px 0 0; color:#555; font-size:13px;">${escapeHtml(gap)}</p>` : ""}`
    : "";

  const body = `
    <h2 style="margin: 0 0 12px;">Your reputation audit is ready</h2>
    <p>Here's the snapshot for <strong>${escapeHtml(businessName)}</strong>.</p>
    ${scoreCard(report.score, report.grade)}
    ${issuesHtml}
    ${competitorHtml}
    <div style="margin: 20px 0 6px;">
      <a href="${resultsUrl(requestId)}" style="display:inline-block; background:#111; color:#fff;
        padding:11px 18px; border-radius:6px; text-decoration:none; font-weight:600; font-size:14px; margin:0 6px 8px 0;">
        View your full results
      </a>
      <a href="${pdfUrl(requestId)}" style="display:inline-block; background:#ffffff; color:#2563eb;
        border:1px solid #c7d2fe; padding:11px 18px; border-radius:6px; text-decoration:none;
        font-weight:600; font-size:14px; margin:0 6px 8px 0;">
        Download PDF report
      </a>
    </div>
    <p style="margin: 18px 0 4px; color:#333;">Ready to turn this into real review growth?</p>
    ${ctaRow()}`;

  const text = [
    `Your Google Reputation Audit for ${businessName} is ready.`,
    ``,
    `Score: ${report.score}/100 (Grade ${report.grade})`,
    scoreExplanation(report.score),
    ``,
    ...(topIssues.length > 0
      ? [`Top issues we found:`, ...topIssues.map((x) => `- ${x}`), ``]
      : []),
    ...(gap ? [`How you compare: ${gap}`, ``] : []),
    `View full results: ${resultsUrl(requestId)}`,
    `Download PDF report: ${pdfUrl(requestId)}`,
    ``,
    `Start your 7-day free trial: ${startTrialUrl}`,
    `Book a demo: ${bookDemoUrl}`,
    ``,
    `Not interested? Reply with "unsubscribe" and we'll stop these emails.`,
  ].join("\n");

  return { subject, html: layout(body), text };
}

// ---------------------------------------------------------------------------
// Follow-up sequence
// ---------------------------------------------------------------------------

export type FollowupKey =
  | "competitor_gap"
  | "top_fixes"
  | "final_conversion";

export type FollowupStep = {
  key: FollowupKey;
  /** Days after audit creation this email should land. */
  delayDays: number;
  /** Stable Inngest step id for the sleep that precedes this send. */
  sleepId: string;
  /** Stable Inngest step id for the send itself. */
  sendId: string;
};

/**
 * The drip schedule. Absolute day offsets from audit creation. The Inngest
 * function sleeps the *incremental* gap between consecutive steps (see
 * incrementalDelayDays) so the whole sequence runs from a single trigger.
 */
export const FOLLOWUP_STEPS: readonly FollowupStep[] = [
  {
    key: "competitor_gap",
    delayDays: 1,
    sleepId: "sleep-until-day-1",
    sendId: "send-competitor-gap",
  },
  {
    key: "top_fixes",
    delayDays: 3,
    sleepId: "sleep-until-day-3",
    sendId: "send-top-fixes",
  },
  {
    key: "final_conversion",
    delayDays: 5,
    sleepId: "sleep-until-day-5",
    sendId: "send-final-conversion",
  },
] as const;

/**
 * Convert absolute day offsets into the incremental sleep (in days) the
 * scheduler should wait *before* each step, given it runs sequentially from a
 * single trigger. e.g. [1,3,5] -> [1,2,2]. Pure + testable.
 */
export function incrementalDelayDays(
  steps: readonly FollowupStep[] = FOLLOWUP_STEPS,
): number[] {
  const out: number[] = [];
  let prev = 0;
  for (const step of steps) {
    out.push(step.delayDays - prev);
    prev = step.delayDays;
  }
  return out;
}

export type FollowupEmailArgs = {
  businessName: string;
  requestId: string;
  report: ReputationReport;
  googleRating?: number | null;
  googleReviewCount?: number | null;
};

function buildCompetitorGapEmail(args: FollowupEmailArgs): EmailPayload {
  const { report, businessName, requestId } = args;
  const subject = `How ${businessName} compares to nearby competitors`;

  const table = competitorTableHtml({
    businessName,
    yourRating: args.googleRating ?? null,
    yourReviewCount: args.googleReviewCount ?? null,
    comparison: report.competitors,
  });
  const gap = competitorGapSummary(report.competitors);

  // Adaptive: when we found real competitors, lead with the comparison;
  // otherwise fall back to a benchmark message so the email still lands.
  const hasCompetitors = table.length > 0;
  const intro = hasCompetitors
    ? `Customers comparing local options usually pick the business with the
       stronger, more recent reviews. Here's where ${escapeHtml(businessName)}
       stands against nearby competitors we found on Google:`
    : `Customers comparing local options usually pick the business with the
       stronger, more recent reviews. Most thriving local businesses carry
       150–200+ Google reviews — and keep them fresh every month.`;

  const body = `
    <h2 style="margin: 0 0 12px;">You vs. the competition</h2>
    <p>${intro}</p>
    ${table}
    ${gap ? `<p style="margin:8px 0 0; color:#555;">${escapeHtml(gap)}</p>` : ""}
    <p style="margin: 18px 0 4px;">AutoFiveStar helps you close the gap — drafting
      replies in your brand voice and helping you request more 5-star reviews on autopilot.</p>
    ${ctaRow()}
    <p style="margin: 8px 0 0; font-size:13px;">
      <a href="${resultsUrl(requestId)}" style="color:#2563eb;">Revisit your full audit &rarr;</a>
    </p>`;

  const text = [
    `How ${businessName} compares to nearby competitors`,
    ``,
    hasCompetitors
      ? `Here's where you stand against nearby competitors:`
      : `Most thriving local businesses carry 150-200+ Google reviews and keep them fresh.`,
    ...(gap ? ["", gap] : []),
    ``,
    `Start your 7-day free trial: ${startTrialUrl}`,
    `Book a demo: ${bookDemoUrl}`,
    `Revisit your audit: ${resultsUrl(requestId)}`,
    ``,
    `Not interested? Reply with "unsubscribe" and we'll stop these emails.`,
  ].join("\n");

  return { subject, html: layout(body), text };
}

function buildTopFixesEmail(args: FollowupEmailArgs): EmailPayload {
  const { report, businessName, requestId } = args;
  const subject = `3 quick fixes to grow ${businessName}'s reviews`;

  const fixes =
    report.recommendations.length > 0
      ? report.recommendations.slice(0, 3)
      : [
          "Ask every happy customer for a Google review the day of service.",
          "Reply to all reviews — positive and negative — to build trust.",
          "Keep a steady cadence so your profile always looks active.",
        ];

  const fixesHtml = fixes
    .map(
      (f, i) => `
      <div style="margin:0 0 12px;">
        <p style="margin:0; font-weight:600; color:#111;">${i + 1}. ${escapeHtml(f)}</p>
      </div>`,
    )
    .join("");

  const body = `
    <h2 style="margin: 0 0 12px;">Your top 3 fixes</h2>
    <p>These are the highest-leverage moves for <strong>${escapeHtml(businessName)}</strong> right now:</p>
    ${fixesHtml}
    <p style="margin: 18px 0 4px;">AutoFiveStar handles most of these for you on the free trial —
      set up with you, no credit card required.</p>
    ${ctaRow()}
    <p style="margin: 8px 0 0; font-size:13px;">
      <a href="${pdfUrl(requestId)}" style="color:#2563eb;">Download your PDF report &rarr;</a>
    </p>`;

  const text = [
    `Your top 3 fixes for ${businessName}:`,
    ``,
    ...fixes.map((f, i) => `${i + 1}. ${f}`),
    ``,
    `Start your 7-day free trial: ${startTrialUrl}`,
    `Book a demo: ${bookDemoUrl}`,
    `Download your PDF report: ${pdfUrl(requestId)}`,
    ``,
    `Not interested? Reply with "unsubscribe" and we'll stop these emails.`,
  ].join("\n");

  return { subject, html: layout(body), text };
}

function buildFinalConversionEmail(args: FollowupEmailArgs): EmailPayload {
  const { businessName, requestId, report } = args;
  const subject = `Ready to turn ${businessName}'s reviews into more calls?`;

  const body = `
    <h2 style="margin: 0 0 12px;">Let's put your reviews to work</h2>
    <p>Your audit gave <strong>${escapeHtml(businessName)}</strong> a
      ${report.score}/100 reputation score. The businesses that win locally aren't
      the ones with the best score today — they're the ones that keep reviews
      fresh and reply fast, every week.</p>
    <p>That's exactly what AutoFiveStar does for you:</p>
    <ul style="margin: 0 0 16px; padding-left: 18px; color:#333;">
      <li style="margin:0 0 6px;">Drafts on-brand replies to every review in seconds — you approve before anything posts.</li>
      <li style="margin:0 0 6px;">Flags negative or urgent reviews so nothing slips through.</li>
      <li style="margin:0 0 6px;">Helps you request more 5-star reviews at the right moment.</li>
    </ul>
    <p style="margin: 18px 0 4px;">Start your 7-day free trial — no credit card required —
      or book a quick demo and we'll walk through your profile together.</p>
    ${ctaRow()}
    <p style="margin: 8px 0 0; font-size:13px;">
      <a href="${resultsUrl(requestId)}" style="color:#2563eb;">Review your audit one more time &rarr;</a>
    </p>`;

  const text = [
    `Ready to turn ${businessName}'s reviews into more calls?`,
    ``,
    `Your reputation score was ${report.score}/100. AutoFiveStar helps you:`,
    `- Draft on-brand replies to every review (you approve first)`,
    `- Flag negative or urgent reviews automatically`,
    `- Request more 5-star reviews at the right moment`,
    ``,
    `Start your 7-day free trial: ${startTrialUrl}`,
    `Book a demo: ${bookDemoUrl}`,
    `Revisit your audit: ${resultsUrl(requestId)}`,
    ``,
    `Not interested? Reply with "unsubscribe" and we'll stop these emails.`,
  ].join("\n");

  return { subject, html: layout(body), text };
}

const FOLLOWUP_BUILDERS: Record<
  FollowupKey,
  (args: FollowupEmailArgs) => EmailPayload
> = {
  competitor_gap: buildCompetitorGapEmail,
  top_fixes: buildTopFixesEmail,
  final_conversion: buildFinalConversionEmail,
};

/** Build a follow-up email payload for a given step key. */
export function buildFollowupEmail(
  key: FollowupKey,
  args: FollowupEmailArgs,
): EmailPayload {
  return FOLLOWUP_BUILDERS[key](args);
}
