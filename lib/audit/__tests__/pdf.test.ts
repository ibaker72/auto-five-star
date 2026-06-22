import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("pdfkit", () => ({ default: class {} }));

import {
  buildPdfReportData,
  type PdfReportInput,
  type PdfReportData,
} from "../pdf";
import type { ReputationReport } from "../score";
import type { AuditLead } from "@/lib/db/schema";

function makeLead(overrides: Partial<AuditLead> = {}): AuditLead {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    businessName: "Smith HVAC",
    email: "smith@example.com",
    website: "https://smithhvac.com",
    gbpUrl: null,
    industry: "hvac",
    city: "Austin, TX",
    phone: "(555) 123-4567",
    source: "website",
    placeId: "ChIJ_test123",
    googleRating: 4.3,
    googleReviewCount: 87,
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
  };
}

function makeReport(overrides: Partial<ReputationReport> = {}): ReputationReport {
  return {
    score: 72,
    grade: "C",
    breakdown: { rating: 34, volume: 9, recency: 0, response: 0 },
    breakdownItems: [
      { label: "Rating quality", value: 52, max: 60 },
      { label: "Review volume", value: 17, max: 40 },
    ],
    strengths: ["Your Google rating signals strong customer satisfaction."],
    opportunities: ["Review volume is below the local-business benchmark."],
    recommendations: [
      "Ask happy customers for a Google review the day of service.",
      "Set a weekly review-request cadence tied to job completion.",
      "Reply to every review to build trust.",
    ],
    dataSource: "google_places",
    competitors: {
      competitors: [
        { name: "Cool Air Co", rating: 4.1, reviewCount: 120 },
        { name: "BreezeHVAC", rating: 4.5, reviewCount: 200 },
      ],
      avgRating: 4.3,
      avgReviewCount: 160,
      ratingGap: 0.0,
    },
    ...overrides,
  };
}

function makeInput(overrides: Partial<PdfReportInput> = {}): PdfReportInput {
  return {
    lead: makeLead(),
    report: makeReport(),
    demoMode: false,
    ...overrides,
  };
}

describe("buildPdfReportData", () => {
  it("extracts business name and city", () => {
    const data = buildPdfReportData(makeInput());
    expect(data.businessName).toBe("Smith HVAC");
    expect(data.city).toBe("Austin, TX");
  });

  it("maps score, grade, and score band", () => {
    const data = buildPdfReportData(makeInput());
    expect(data.score).toBe(72);
    expect(data.grade).toBe("C");
    expect(data.scoreBand).toBe("Needs attention");
  });

  it("returns Excellent band for score >= 90", () => {
    const data = buildPdfReportData(
      makeInput({ report: makeReport({ score: 95, grade: "A" }) }),
    );
    expect(data.scoreBand).toBe("Excellent");
  });

  it("returns Strong band for score 75-89", () => {
    const data = buildPdfReportData(
      makeInput({ report: makeReport({ score: 80, grade: "B" }) }),
    );
    expect(data.scoreBand).toBe("Strong");
  });

  it("returns Likely costing you leads band for score < 60", () => {
    const data = buildPdfReportData(
      makeInput({ report: makeReport({ score: 45, grade: "F" }) }),
    );
    expect(data.scoreBand).toBe("Likely costing you leads");
  });

  it("uses breakdownItems when present", () => {
    const data = buildPdfReportData(makeInput());
    expect(data.breakdownItems).toEqual([
      { label: "Rating quality", value: 52, max: 60 },
      { label: "Review volume", value: 17, max: 40 },
    ]);
  });

  it("falls back to 4-dimension breakdown when breakdownItems missing", () => {
    const report = makeReport();
    delete report.breakdownItems;
    const data = buildPdfReportData(makeInput({ report }));
    expect(data.breakdownItems).toHaveLength(4);
    expect(data.breakdownItems[0]!.label).toBe("Rating");
  });

  it("limits top fixes to 3", () => {
    const report = makeReport({
      recommendations: ["Fix 1", "Fix 2", "Fix 3", "Fix 4", "Fix 5"],
    });
    const data = buildPdfReportData(makeInput({ report }));
    expect(data.topFixes).toHaveLength(3);
    expect(data.topFixes[2]).toBe("Fix 3");
  });

  it("maps competitor comparison with your row first", () => {
    const data = buildPdfReportData(makeInput());
    expect(data.competitors).not.toBeNull();
    expect(data.competitors!.rows[0]!.name).toBe("Smith HVAC (you)");
    expect(data.competitors!.rows[0]!.isYou).toBe(true);
    expect(data.competitors!.rows[1]!.name).toBe("Cool Air Co");
    expect(data.competitors!.rows[1]!.isYou).toBe(false);
    expect(data.competitors!.ratingGap).toBe(0.0);
  });

  it("returns null competitors when none present", () => {
    const report = makeReport({ competitors: undefined });
    const data = buildPdfReportData(makeInput({ report }));
    expect(data.competitors).toBeNull();
  });

  it("returns null competitors when competitors array is empty", () => {
    const report = makeReport({
      competitors: {
        competitors: [],
        avgRating: null,
        avgReviewCount: null,
        ratingGap: null,
      },
    });
    const data = buildPdfReportData(makeInput({ report }));
    expect(data.competitors).toBeNull();
  });

  it("passes through demoMode flag", () => {
    const data = buildPdfReportData(makeInput({ demoMode: true }));
    expect(data.demoMode).toBe(true);
  });

  it("passes through Google rating and review count from lead", () => {
    const data = buildPdfReportData(makeInput());
    expect(data.googleRating).toBe(4.3);
    expect(data.googleReviewCount).toBe(87);
  });

  it("handles null Google data gracefully", () => {
    const lead: AuditLead = {
      id: "22222222-2222-2222-2222-222222222222",
      businessName: "No Google Biz",
      email: "test@example.com",
      website: null,
      gbpUrl: null,
      industry: null,
      city: null,
      phone: null,
      source: "website",
      placeId: null,
      googleRating: null,
      googleReviewCount: null,
      createdAt: new Date("2026-06-01"),
      updatedAt: new Date("2026-06-01"),
    };
    const report = makeReport({ competitors: undefined });
    const data = buildPdfReportData({ lead, report, demoMode: false });
    expect(data.googleRating).toBeNull();
    expect(data.googleReviewCount).toBeNull();
  });
});

describe("buildPdfReportData round-trip", () => {
  it("produces a structure that covers all rendering sections", () => {
    const data: PdfReportData = buildPdfReportData(makeInput());
    expect(data.businessName).toBeTruthy();
    expect(typeof data.score).toBe("number");
    expect(typeof data.grade).toBe("string");
    expect(typeof data.scoreBand).toBe("string");
    expect(data.breakdownItems.length).toBeGreaterThan(0);
    expect(data.topFixes.length).toBeGreaterThan(0);
    expect(data.competitors).not.toBeNull();
  });
});
