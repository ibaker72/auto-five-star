/**
 * Pure scheduling logic for drip review-request campaigns — no `server-only`,
 * no DB, no clock. Everything here is deterministic so the cron orchestrator
 * stays thin and the scheduling/pacing rules are exhaustively unit-testable.
 *
 * Model: when a campaign is created in "scheduled" mode we pre-compute a
 * `scheduledAt` for every recipient by bucketing them into days of
 * `dailyLimit` each, starting at `scheduledStartAt`. The cron then sends due,
 * still-pending recipients, capped by the daily limit as a backstop.
 */

export type CampaignSendMode = "immediate" | "scheduled";

/** Daily-limit presets surfaced in the UI. Any positive int is accepted. */
export const DAILY_LIMIT_OPTIONS = [10, 25, 50] as const;
export type DailyLimitOption = (typeof DAILY_LIMIT_OPTIONS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** 0-based day bucket for the recipient at `index` given a daily limit. */
export function recipientDayOffset(index: number, dailyLimit: number): number {
  if (index <= 0) return 0;
  if (dailyLimit <= 0 || !Number.isFinite(dailyLimit)) return 0;
  return Math.floor(index / dailyLimit);
}

/** Absolute send time for the recipient at `index`. */
export function recipientScheduledAt(
  index: number,
  dailyLimit: number,
  startAt: Date,
): Date {
  return addDays(startAt, recipientDayOffset(index, dailyLimit));
}

/** How many calendar days the campaign will span. */
export function campaignDaySpan(total: number, dailyLimit: number): number {
  if (total <= 0) return 0;
  if (dailyLimit <= 0 || !Number.isFinite(dailyLimit)) return 1;
  return Math.ceil(total / dailyLimit);
}

/** Pre-compute the schedule (one `scheduledAt` per recipient, in order). */
export function buildSchedule(
  total: number,
  dailyLimit: number,
  startAt: Date,
): Date[] {
  const out: Date[] = [];
  for (let i = 0; i < total; i++) {
    out.push(recipientScheduledAt(i, dailyLimit, startAt));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Campaign / recipient state
// ---------------------------------------------------------------------------

/** Statuses the cron is allowed to act on. */
export const SENDABLE_CAMPAIGN_STATUSES = ["scheduled", "sending"] as const;

/** True only when the cron may send for this campaign (never paused/etc.). */
export function isCampaignSendable(status: string): boolean {
  return (SENDABLE_CAMPAIGN_STATUSES as readonly string[]).includes(status);
}

/** Only "pending" recipients are ever (re)sent — the no-duplicate guarantee. */
export function isPendingRecipientStatus(status: string): boolean {
  return status === "pending";
}

export type SchedulableRecipient = {
  status: string;
  scheduledAt: Date | null;
};

/**
 * Choose which recipients to send in this cron run. Enforces, in order:
 *  - status must be "pending" (sent/failed/skipped are never re-sent)
 *  - the recipient must be due (scheduledAt <= now; null = send asap)
 *  - the daily limit: cap = max(0, dailyLimit - alreadySentInWindow)
 *
 * Returns due recipients in ascending scheduledAt order, capped to the limit.
 */
export function selectDueRecipients<T extends SchedulableRecipient>(
  recipients: T[],
  opts: { now: Date; dailyLimit: number | null; sentInWindow: number },
): T[] {
  const nowMs = opts.now.getTime();
  const due = recipients
    .filter(
      (r) =>
        isPendingRecipientStatus(r.status) &&
        (r.scheduledAt === null || r.scheduledAt.getTime() <= nowMs),
    )
    .sort(
      (a, b) =>
        (a.scheduledAt?.getTime() ?? 0) - (b.scheduledAt?.getTime() ?? 0),
    );

  if (opts.dailyLimit === null || !Number.isFinite(opts.dailyLimit)) {
    return due;
  }
  const remaining = Math.max(0, opts.dailyLimit - Math.max(0, opts.sentInWindow));
  return due.slice(0, remaining);
}

/** SMS rows are skipped when the org isn't entitled to SMS review requests. */
export function shouldSkipForEntitlement(
  channel: string,
  opts: { smsEntitled: boolean },
): boolean {
  return channel === "sms" && !opts.smsEntitled;
}

/** A campaign is complete once no pending recipients remain. */
export function isCampaignComplete(counts: { pending: number }): boolean {
  return counts.pending === 0;
}

/** The next future send time among still-pending recipients, or null. */
export function nextScheduledWindow<T extends SchedulableRecipient>(
  recipients: T[],
  now: Date,
): Date | null {
  const nowMs = now.getTime();
  let min: number | null = null;
  for (const r of recipients) {
    if (!isPendingRecipientStatus(r.status) || !r.scheduledAt) continue;
    const t = r.scheduledAt.getTime();
    if (t > nowMs && (min === null || t < min)) min = t;
  }
  return min === null ? null : new Date(min);
}

export type BatchResult = { status: "sent" | "skipped" | "failed" };

/** Tally a batch of send results. Pure — used for events/return values. */
export function summarizeBatch(results: BatchResult[]): {
  sent: number;
  skipped: number;
  failed: number;
} {
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === "sent") sent++;
    else if (r.status === "skipped") skipped++;
    else failed++;
  }
  return { sent, skipped, failed };
}
