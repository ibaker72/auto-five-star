import { describe, it, expect } from "vitest";
import {
  rate,
  formatPct,
  emptyCounts,
  computeCampaignMetrics,
  roiSummaryText,
  type CampaignCounts,
} from "../campaign-analytics";

function counts(overrides: Partial<CampaignCounts> = {}): CampaignCounts {
  return { ...emptyCounts(), ...overrides };
}

describe("rate", () => {
  it("returns 0 when the denominator is 0 (no divide-by-zero)", () => {
    expect(rate(0, 0)).toBe(0);
    expect(rate(5, 0)).toBe(0);
  });

  it("computes a normal ratio", () => {
    expect(rate(1, 4)).toBe(0.25);
    expect(rate(3, 6)).toBe(0.5);
  });

  it("clamps to [0, 1]", () => {
    expect(rate(5, 4)).toBe(1);
    expect(rate(-1, 4)).toBe(0);
  });
});

describe("formatPct", () => {
  it("formats whole percents without decimals", () => {
    expect(formatPct(0.5)).toBe("50%");
    expect(formatPct(0)).toBe("0%");
    expect(formatPct(1)).toBe("100%");
  });

  it("keeps one decimal for fractional percents", () => {
    expect(formatPct(0.125)).toBe("12.5%");
    expect(formatPct(0.333)).toBe("33.3%");
  });

  it("clamps out-of-range input", () => {
    expect(formatPct(1.5)).toBe("100%");
    expect(formatPct(-0.2)).toBe("0%");
  });
});

describe("computeCampaignMetrics", () => {
  it("zero-recipient campaign yields all-zero metrics and no NaN", () => {
    const m = computeCampaignMetrics(emptyCounts());
    expect(m.total).toBe(0);
    expect(m.sent).toBe(0);
    expect(m.clickThroughRate).toBe(0);
    expect(m.reviewConversionRate).toBe(0);
    expect(m.clickToReviewRate).toBe(0);
    expect(m.hasPending).toBe(false);
    expect(Number.isNaN(m.reviewConversionRate)).toBe(false);
  });

  it("sent but no clicks → 0% CTR and 0% conversion", () => {
    const m = computeCampaignMetrics(
      counts({ total: 20, sent: 20, clicked: 0, reviews: 0 }),
    );
    expect(m.clickThroughRate).toBe(0);
    expect(m.reviewConversionRate).toBe(0);
  });

  it("clicks but no reviews → CTR > 0 but 0% conversion", () => {
    const m = computeCampaignMetrics(
      counts({ total: 10, sent: 10, clicked: 4, reviews: 0 }),
    );
    expect(m.clickThroughRate).toBeCloseTo(0.4);
    expect(m.reviewConversionRate).toBe(0);
    expect(m.clickToReviewRate).toBe(0);
  });

  it("attributed reviews produce a correct conversion rate", () => {
    const m = computeCampaignMetrics(
      counts({ total: 50, sent: 40, clicked: 20, reviews: 10 }),
    );
    expect(m.clickThroughRate).toBeCloseTo(0.5); // 20/40
    expect(m.reviewConversionRate).toBeCloseTo(0.25); // 10/40
    expect(m.clickToReviewRate).toBeCloseTo(0.5); // 10/20
  });

  it("flags in-progress (pending) campaigns", () => {
    const m = computeCampaignMetrics(counts({ total: 30, sent: 10, pending: 20 }));
    expect(m.hasPending).toBe(true);
  });

  it("carries through last-sent and next-scheduled timestamps", () => {
    const last = new Date("2026-06-10T10:00:00Z");
    const next = new Date("2026-06-12T10:00:00Z");
    const m = computeCampaignMetrics(
      counts({ total: 30, sent: 10, pending: 20, lastSentAt: last, nextScheduledAt: next }),
    );
    expect(m.lastSentAt).toBe(last);
    expect(m.nextScheduledAt).toBe(next);
  });
});

describe("roiSummaryText", () => {
  it("explains when nothing has been sent", () => {
    expect(roiSummaryText(computeCampaignMetrics(emptyCounts()))).toBe(
      "No requests have been sent yet.",
    );
  });

  it("notes scheduled-but-unsent drip campaigns", () => {
    const m = computeCampaignMetrics(counts({ total: 30, sent: 0, pending: 30 }));
    expect(roiSummaryText(m)).toContain("scheduled");
  });

  it("reports sent-with-no-clicks credibly", () => {
    const m = computeCampaignMetrics(counts({ total: 20, sent: 20 }));
    expect(roiSummaryText(m)).toBe(
      "20 requests sent — no clicks or attributed reviews yet.",
    );
  });

  it("reports clicks-without-reviews", () => {
    const m = computeCampaignMetrics(counts({ total: 10, sent: 10, clicked: 3 }));
    expect(roiSummaryText(m)).toBe(
      "10 requests sent, 3 clicks through — no attributed reviews yet.",
    );
  });

  it("states attributed reviews and conversion rate without revenue claims", () => {
    const m = computeCampaignMetrics(
      counts({ total: 50, sent: 40, clicked: 20, reviews: 10 }),
    );
    const text = roiSummaryText(m);
    expect(text).toBe(
      "Generated 10 attributed reviews from 40 requests sent — a 25% conversion rate.",
    );
    expect(text.toLowerCase()).not.toContain("$");
    expect(text.toLowerCase()).not.toContain("revenue");
  });

  it("uses singular grammar for a single review/request", () => {
    const m = computeCampaignMetrics(counts({ total: 1, sent: 1, reviews: 1 }));
    expect(roiSummaryText(m)).toBe(
      "Generated 1 attributed review from 1 request sent — a 100% conversion rate.",
    );
  });
});
