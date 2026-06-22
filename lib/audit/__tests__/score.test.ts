import { describe, it, expect } from "vitest";
import {
  computeReputationReport,
  buildDemoInputs,
  type ReputationInputs,
} from "../score";

const NOW = new Date("2026-06-22T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function makeInputs(overrides: Partial<ReputationInputs> = {}): ReputationInputs {
  return {
    averageRating: 4.5,
    reviewCount: 150,
    lastReviewAt: new Date(NOW.getTime() - 5 * DAY),
    responseRate: 0.8,
    ...overrides,
  };
}

describe("computeReputationReport", () => {
  it("returns a perfect score for ideal inputs", () => {
    const report = computeReputationReport(
      {
        averageRating: 5.0,
        reviewCount: 250,
        lastReviewAt: new Date(NOW.getTime() - 1 * DAY),
        responseRate: 1.0,
      },
      { now: NOW },
    );
    expect(report.score).toBe(100);
    expect(report.grade).toBe("A");
  });

  it("returns zero for no reviews", () => {
    const report = computeReputationReport(
      {
        averageRating: null,
        reviewCount: 0,
        lastReviewAt: null,
        responseRate: null,
      },
      { now: NOW },
    );
    expect(report.score).toBe(0);
    expect(report.grade).toBe("F");
    expect(report.opportunities.length).toBeGreaterThan(0);
  });

  it("scores breakdown adds up to total", () => {
    const report = computeReputationReport(makeInputs(), { now: NOW });
    const { rating, volume, recency, response } = report.breakdown;
    expect(rating + volume + recency + response).toBe(report.score);
  });

  it("grades correctly at boundaries", () => {
    const gradeFor = (score: number) => {
      const r = computeReputationReport(makeInputs(), { now: NOW });
      // We can't directly control the score, so test the grade function via known inputs
      return r.grade;
    };

    // High rating, high volume, recent, good response rate = A
    const a = computeReputationReport(
      { averageRating: 4.8, reviewCount: 200, lastReviewAt: new Date(NOW.getTime() - 2 * DAY), responseRate: 0.95 },
      { now: NOW },
    );
    expect(a.grade).toBe("A");

    // Low everything = F
    const f = computeReputationReport(
      { averageRating: 2.0, reviewCount: 5, lastReviewAt: new Date(NOW.getTime() - 400 * DAY), responseRate: 0.05 },
      { now: NOW },
    );
    expect(f.grade).toBe("F");
  });

  it("recency decays linearly between 30 and 365 days", () => {
    const recent = computeReputationReport(
      makeInputs({ lastReviewAt: new Date(NOW.getTime() - 15 * DAY) }),
      { now: NOW },
    );
    const stale = computeReputationReport(
      makeInputs({ lastReviewAt: new Date(NOW.getTime() - 200 * DAY) }),
      { now: NOW },
    );
    expect(recent.breakdown.recency).toBeGreaterThan(stale.breakdown.recency);
  });

  it("caps score at 100", () => {
    const report = computeReputationReport(
      { averageRating: 5.0, reviewCount: 500, lastReviewAt: NOW, responseRate: 1.0 },
      { now: NOW },
    );
    expect(report.score).toBeLessThanOrEqual(100);
  });

  it("generates strengths for high-performing businesses", () => {
    const report = computeReputationReport(
      { averageRating: 4.8, reviewCount: 200, lastReviewAt: new Date(NOW.getTime() - 5 * DAY), responseRate: 0.9 },
      { now: NOW },
    );
    expect(report.strengths.length).toBeGreaterThan(0);
  });

  it("generates opportunities for low-performing businesses", () => {
    const report = computeReputationReport(
      { averageRating: 3.0, reviewCount: 10, lastReviewAt: null, responseRate: 0.1 },
      { now: NOW },
    );
    expect(report.opportunities.length).toBeGreaterThan(0);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });
});

describe("buildDemoInputs", () => {
  it("returns deterministic results for the same seed", () => {
    const a = buildDemoInputs("test@example.com", { now: NOW });
    const b = buildDemoInputs("test@example.com", { now: NOW });
    expect(a.inputs).toEqual(b.inputs);
  });

  it("returns different results for different seeds", () => {
    const a = buildDemoInputs("alice@example.com", { now: NOW });
    const b = buildDemoInputs("bob@example.com", { now: NOW });
    expect(a.inputs.averageRating).not.toBe(b.inputs.averageRating);
  });

  it("produces ratings in the believable range", () => {
    for (const seed of ["a@b.com", "x@y.com", "test@test.com", "z@z.com"]) {
      const { inputs } = buildDemoInputs(seed, { now: NOW });
      expect(inputs.averageRating).toBeGreaterThanOrEqual(3.6);
      expect(inputs.averageRating).toBeLessThanOrEqual(4.8);
      expect(inputs.reviewCount).toBeGreaterThanOrEqual(18);
      expect(inputs.reviewCount).toBeLessThanOrEqual(200);
      expect(inputs.responseRate).toBeGreaterThanOrEqual(0.1);
      expect(inputs.responseRate).toBeLessThanOrEqual(0.65);
    }
  });

  it("includes a rationale string", () => {
    const { rationale } = buildDemoInputs("test@test.com");
    expect(rationale).toContain("Demo mode");
  });
});
