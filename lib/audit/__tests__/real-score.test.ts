import { describe, it, expect } from "vitest";
import {
  computeRealReputationReport,
  buildCompetitorComparison,
  type CompetitorStat,
} from "../score";

describe("computeRealReputationReport", () => {
  it("scores a top business near 100", () => {
    const report = computeRealReputationReport({
      averageRating: 5.0,
      reviewCount: 300,
    });
    expect(report.score).toBe(100);
    expect(report.grade).toBe("A");
    expect(report.dataSource).toBe("google_places");
  });

  it("scores rating out of 60 and volume out of 40", () => {
    // One review: rating is trusted (60 max), volume rounds to 0 of 40.
    const report = computeRealReputationReport({
      averageRating: 5.0,
      reviewCount: 1,
    });
    expect(report.score).toBe(60);
    expect(report.breakdownItems).toBeDefined();
    const rating = report.breakdownItems!.find(
      (b) => b.label === "Rating quality",
    );
    const volume = report.breakdownItems!.find(
      (b) => b.label === "Review volume",
    );
    expect(rating).toEqual({ label: "Rating quality", value: 60, max: 60 });
    expect(volume).toEqual({ label: "Review volume", value: 0, max: 40 });
  });

  it("scores zero when there are no reviews even with a rating", () => {
    // No reviews → rating can't be trusted → 0.
    const report = computeRealReputationReport({
      averageRating: 5.0,
      reviewCount: 0,
    });
    expect(report.score).toBe(0);
  });

  it("breakdownItems values never exceed their max", () => {
    const report = computeRealReputationReport({
      averageRating: 5.0,
      reviewCount: 10_000,
    });
    for (const item of report.breakdownItems!) {
      expect(item.value).toBeLessThanOrEqual(item.max);
    }
    expect(report.score).toBeLessThanOrEqual(100);
  });

  it("handles a business with no reviews", () => {
    const report = computeRealReputationReport({
      averageRating: null,
      reviewCount: 0,
    });
    expect(report.score).toBe(0);
    expect(report.grade).toBe("F");
    expect(report.opportunities[0]).toContain("couldn't read any public");
  });

  it("always includes the reply-gap recommendation", () => {
    const report = computeRealReputationReport({
      averageRating: 4.5,
      reviewCount: 120,
    });
    expect(
      report.recommendations.some((r) => r.toLowerCase().includes("reply")),
    ).toBe(true);
  });

  it("praises a business that beats competitors", () => {
    const comparison = buildCompetitorComparison(
      [
        { name: "A", rating: 4.0, reviewCount: 50 },
        { name: "B", rating: 4.1, reviewCount: 60 },
      ],
      4.8,
    );
    const report = computeRealReputationReport(
      { averageRating: 4.8, reviewCount: 200 },
      { comparison },
    );
    expect(report.competitors).toBe(comparison);
    expect(
      report.strengths.some((s) => s.includes("higher than nearby")),
    ).toBe(true);
  });

  it("flags a rating gap when behind competitors", () => {
    const comparison = buildCompetitorComparison(
      [
        { name: "A", rating: 4.8, reviewCount: 300 },
        { name: "B", rating: 4.9, reviewCount: 400 },
      ],
      4.0,
    );
    const report = computeRealReputationReport(
      { averageRating: 4.0, reviewCount: 50 },
      { comparison },
    );
    expect(
      report.opportunities.some((o) => o.includes("Nearby competitors")),
    ).toBe(true);
    expect(
      report.opportunities.some((o) => o.includes("Competitors average")),
    ).toBe(true);
  });
});

describe("buildCompetitorComparison", () => {
  it("averages rating and review count", () => {
    const stats: CompetitorStat[] = [
      { name: "A", rating: 4.0, reviewCount: 100 },
      { name: "B", rating: 5.0, reviewCount: 200 },
    ];
    const cmp = buildCompetitorComparison(stats, 4.5);
    expect(cmp.avgRating).toBe(4.5);
    expect(cmp.avgReviewCount).toBe(150);
    expect(cmp.ratingGap).toBe(0);
  });

  it("computes a positive rating gap when you're ahead", () => {
    const cmp = buildCompetitorComparison(
      [{ name: "A", rating: 4.0, reviewCount: 100 }],
      4.6,
    );
    expect(cmp.ratingGap).toBeCloseTo(0.6, 5);
  });

  it("ignores competitors with null rating in the average", () => {
    const cmp = buildCompetitorComparison(
      [
        { name: "A", rating: 4.0, reviewCount: 100 },
        { name: "B", rating: null, reviewCount: null },
      ],
      4.0,
    );
    expect(cmp.avgRating).toBe(4.0);
    expect(cmp.avgReviewCount).toBe(100);
  });

  it("returns null averages when no competitor has data", () => {
    const cmp = buildCompetitorComparison(
      [{ name: "A", rating: null, reviewCount: null }],
      4.0,
    );
    expect(cmp.avgRating).toBeNull();
    expect(cmp.avgReviewCount).toBeNull();
    expect(cmp.ratingGap).toBeNull();
  });
});
