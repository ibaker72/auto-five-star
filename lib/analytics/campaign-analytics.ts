/**
 * Pure campaign analytics — no `server-only`, no DB. Turns raw recipient
 * counts (which the data layer aggregates) into customer-facing metrics and
 * rates. Kept pure so every rate/edge case is unit-testable.
 *
 * Counts come from the `review_request_recipients` timestamp columns, which
 * are cumulative: `sentAt`, `clickedAt`, and `reviewedAt` all remain set as a
 * recipient progresses, so a clicked or reviewed recipient still counts as
 * sent. That makes the rates below well-defined.
 */

export type CampaignCounts = {
  total: number;
  /** Recipients actually sent at least once (sentAt is set). */
  sent: number;
  pending: number;
  failed: number;
  skipped: number;
  /** Recipients who clicked the tracked review link (clickedAt is set). */
  clicked: number;
  /** Recipients matched to a new review (reviewedAt is set). */
  reviews: number;
  lastSentAt: Date | null;
  nextScheduledAt: Date | null;
};

export type CampaignMetrics = CampaignCounts & {
  /** clicked / sent, clamped to [0, 1]. */
  clickThroughRate: number;
  /** reviews / sent, clamped to [0, 1]. */
  reviewConversionRate: number;
  /** reviews / clicked, clamped to [0, 1]. */
  clickToReviewRate: number;
  /** Whether any recipients still await sending. */
  hasPending: boolean;
};

/** Safe ratio: returns 0 when the denominator is 0, clamped to [0, 1]. */
export function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  const r = numerator / denominator;
  if (r < 0) return 0;
  if (r > 1) return 1;
  return r;
}

/** Format a 0..1 rate as a percent string, e.g. 0.125 -> "12.5%", 0.5 -> "50%". */
export function formatPct(r: number): string {
  const clamped = Math.max(0, Math.min(1, r));
  const rounded = Math.round(clamped * 100 * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

export function emptyCounts(): CampaignCounts {
  return {
    total: 0,
    sent: 0,
    pending: 0,
    failed: 0,
    skipped: 0,
    clicked: 0,
    reviews: 0,
    lastSentAt: null,
    nextScheduledAt: null,
  };
}

/** Derive rates and flags from raw counts. Pure. */
export function computeCampaignMetrics(counts: CampaignCounts): CampaignMetrics {
  return {
    ...counts,
    clickThroughRate: rate(counts.clicked, counts.sent),
    reviewConversionRate: rate(counts.reviews, counts.sent),
    clickToReviewRate: rate(counts.reviews, counts.clicked),
    hasPending: counts.pending > 0,
  };
}

/**
 * A short, credible ROI/value sentence for a campaign. Deliberately avoids any
 * revenue or earnings claims — it only states what the attribution data
 * supports (requests sent, clicks, attributed reviews, conversion rate).
 */
export function roiSummaryText(metrics: CampaignMetrics): string {
  if (metrics.sent === 0) {
    return metrics.pending > 0
      ? "No requests have been sent yet — sends are scheduled."
      : "No requests have been sent yet.";
  }

  const sentLabel = `${metrics.sent} request${metrics.sent === 1 ? "" : "s"}`;

  if (metrics.reviews === 0) {
    if (metrics.clicked === 0) {
      return `${sentLabel} sent — no clicks or attributed reviews yet.`;
    }
    const clickLabel = `${metrics.clicked} click${metrics.clicked === 1 ? "" : "s"}`;
    return `${sentLabel} sent, ${clickLabel} through — no attributed reviews yet.`;
  }

  const reviewLabel = `${metrics.reviews} attributed review${metrics.reviews === 1 ? "" : "s"}`;
  return `Generated ${reviewLabel} from ${sentLabel} sent — a ${formatPct(
    metrics.reviewConversionRate,
  )} conversion rate.`;
}
