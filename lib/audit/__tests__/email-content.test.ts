import { describe, it, expect } from "vitest";
import {
  buildAuditReportEmail,
  buildFollowupEmail,
  competitorGapSummary,
  competitorTableHtml,
  FOLLOWUP_STEPS,
  incrementalDelayDays,
  pdfUrl,
  resultsUrl,
} from "../email-content";
import type { ReputationReport, CompetitorComparison } from "../score";

const COMPARISON: CompetitorComparison = {
  competitors: [
    { name: "Cool Air Co", rating: 4.1, reviewCount: 120 },
    { name: "BreezeHVAC", rating: 4.6, reviewCount: 210 },
  ],
  avgRating: 4.35,
  avgReviewCount: 165,
  ratingGap: -0.15,
};

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
    opportunities: [
      "Review volume is below the local-business benchmark.",
      "Many reviews go unanswered.",
      "Your last review was a while ago.",
    ],
    recommendations: [
      "Ask happy customers for a Google review the day of service.",
      "Set a weekly review-request cadence tied to job completion.",
      "Reply to every review to build trust.",
    ],
    dataSource: "google_places",
    competitors: COMPARISON,
    ...overrides,
  };
}

const REQUEST_ID = "33333333-3333-3333-3333-333333333333";

describe("buildAuditReportEmail", () => {
  it("has the expected subject", () => {
    const email = buildAuditReportEmail({
      businessName: "Smith HVAC",
      requestId: REQUEST_ID,
      report: makeReport(),
    });
    expect(email.subject).toBe("Your Google Reputation Audit is ready");
  });

  it("includes business name, score, and grade", () => {
    const email = buildAuditReportEmail({
      businessName: "Smith HVAC",
      requestId: REQUEST_ID,
      report: makeReport(),
    });
    expect(email.html).toContain("Smith HVAC");
    expect(email.html).toContain("72");
    expect(email.html).toContain("Grade C");
  });

  it("includes a results link and a PDF download link", () => {
    const email = buildAuditReportEmail({
      businessName: "Smith HVAC",
      requestId: REQUEST_ID,
      report: makeReport(),
    });
    expect(email.html).toContain(resultsUrl(REQUEST_ID));
    expect(email.html).toContain(pdfUrl(REQUEST_ID));
    expect(email.html).toContain(`/api/audit/${REQUEST_ID}/pdf`);
  });

  it("includes the trial and demo CTAs", () => {
    const email = buildAuditReportEmail({
      businessName: "Smith HVAC",
      requestId: REQUEST_ID,
      report: makeReport(),
    });
    expect(email.html).toContain("Start 7-day free trial");
    expect(email.html).toContain("Book a demo");
    expect(email.html).toContain("/signup?plan=growth");
    expect(email.html).toContain("/contact?topic=demo");
  });

  it("includes top issues from opportunities", () => {
    const email = buildAuditReportEmail({
      businessName: "Smith HVAC",
      requestId: REQUEST_ID,
      report: makeReport(),
    });
    expect(email.html).toContain("Top issues we found");
    expect(email.html).toContain(
      "Review volume is below the local-business benchmark.",
    );
  });

  it("includes a competitor comparison table when competitors exist", () => {
    const email = buildAuditReportEmail({
      businessName: "Smith HVAC",
      requestId: REQUEST_ID,
      report: makeReport(),
      googleRating: 4.2,
      googleReviewCount: 87,
    });
    expect(email.html).toContain("How you compare");
    expect(email.html).toContain("Cool Air Co");
    expect(email.html).toContain("BreezeHVAC");
    expect(email.html).toContain("Smith HVAC (you)");
  });

  it("omits the competitor section when there are no competitors", () => {
    const email = buildAuditReportEmail({
      businessName: "Smith HVAC",
      requestId: REQUEST_ID,
      report: makeReport({ competitors: undefined }),
    });
    expect(email.html).not.toContain("How you compare");
  });

  it("escapes HTML in the business name", () => {
    const email = buildAuditReportEmail({
      businessName: "Bob & <script>Co</script>",
      requestId: REQUEST_ID,
      report: makeReport(),
    });
    expect(email.html).toContain("Bob &amp; &lt;script&gt;");
    expect(email.html).not.toContain("<script>Co</script>");
  });

  it("produces a plain-text alternative with the key links", () => {
    const email = buildAuditReportEmail({
      businessName: "Smith HVAC",
      requestId: REQUEST_ID,
      report: makeReport(),
    });
    expect(email.text).toContain("Score: 72/100 (Grade C)");
    expect(email.text).toContain(pdfUrl(REQUEST_ID));
    expect(email.text).toContain("unsubscribe");
  });

  it("includes opt-out copy in the footer", () => {
    const email = buildAuditReportEmail({
      businessName: "Smith HVAC",
      requestId: REQUEST_ID,
      report: makeReport(),
    });
    expect(email.html.toLowerCase()).toContain("unsubscribe");
    expect(email.html).toContain("/privacy");
  });
});

describe("competitorTableHtml", () => {
  it("returns empty string when no comparison", () => {
    expect(
      competitorTableHtml({
        businessName: "X",
        yourRating: 4,
        yourReviewCount: 10,
        comparison: undefined,
      }),
    ).toBe("");
  });

  it("returns empty string when comparison has no competitors", () => {
    expect(
      competitorTableHtml({
        businessName: "X",
        yourRating: 4,
        yourReviewCount: 10,
        comparison: {
          competitors: [],
          avgRating: null,
          avgReviewCount: null,
          ratingGap: null,
        },
      }),
    ).toBe("");
  });

  it("renders a row for the business and each competitor", () => {
    const html = competitorTableHtml({
      businessName: "Smith HVAC",
      yourRating: 4.2,
      yourReviewCount: 87,
      comparison: COMPARISON,
    });
    expect(html).toContain("Smith HVAC (you)");
    expect(html).toContain("4.2");
    expect(html).toContain("Cool Air Co");
    expect(html).toContain("BreezeHVAC");
  });

  it("renders em-dash for null rating/count", () => {
    const html = competitorTableHtml({
      businessName: "Smith HVAC",
      yourRating: null,
      yourReviewCount: null,
      comparison: COMPARISON,
    });
    expect(html).toContain("—");
  });
});

describe("competitorGapSummary", () => {
  it("returns null when no comparison", () => {
    expect(competitorGapSummary(undefined)).toBeNull();
  });

  it("returns null when ratingGap is null", () => {
    expect(
      competitorGapSummary({
        competitors: [],
        avgRating: null,
        avgReviewCount: null,
        ratingGap: null,
      }),
    ).toBeNull();
  });

  it("describes being behind the average", () => {
    const summary = competitorGapSummary({ ...COMPARISON, ratingGap: -0.4 });
    expect(summary).toContain("0.4 stars behind");
  });

  it("describes being ahead of the average", () => {
    const summary = competitorGapSummary({ ...COMPARISON, ratingGap: 0.3 });
    expect(summary).toContain("ahead of the local average");
  });
});

describe("follow-up scheduling", () => {
  it("has three steps on days 1, 3, and 5", () => {
    expect(FOLLOWUP_STEPS.map((s) => s.delayDays)).toEqual([1, 3, 5]);
    expect(FOLLOWUP_STEPS.map((s) => s.key)).toEqual([
      "competitor_gap",
      "top_fixes",
      "final_conversion",
    ]);
  });

  it("has unique sleep and send ids per step", () => {
    const sleepIds = FOLLOWUP_STEPS.map((s) => s.sleepId);
    const sendIds = FOLLOWUP_STEPS.map((s) => s.sendId);
    expect(new Set(sleepIds).size).toBe(sleepIds.length);
    expect(new Set(sendIds).size).toBe(sendIds.length);
  });

  it("converts absolute offsets into incremental sleeps", () => {
    expect(incrementalDelayDays()).toEqual([1, 2, 2]);
  });

  it("handles a custom schedule", () => {
    expect(
      incrementalDelayDays([
        { key: "competitor_gap", delayDays: 2, sleepId: "a", sendId: "b" },
        { key: "top_fixes", delayDays: 7, sleepId: "c", sendId: "d" },
      ]),
    ).toEqual([2, 5]);
  });
});

describe("buildFollowupEmail", () => {
  const base = {
    businessName: "Smith HVAC",
    requestId: REQUEST_ID,
    report: makeReport(),
    googleRating: 4.2,
    googleReviewCount: 87,
  };

  it("competitor_gap email includes the comparison and CTAs", () => {
    const email = buildFollowupEmail("competitor_gap", base);
    expect(email.subject).toContain("compares to nearby competitors");
    expect(email.html).toContain("Cool Air Co");
    expect(email.html).toContain("Start 7-day free trial");
    expect(email.html).toContain("Book a demo");
  });

  it("competitor_gap email falls back to benchmark copy without competitors", () => {
    const email = buildFollowupEmail("competitor_gap", {
      ...base,
      report: makeReport({ competitors: undefined }),
    });
    expect(email.html).toContain("150");
    expect(email.html).not.toContain("Cool Air Co");
  });

  it("top_fixes email lists the top 3 recommendations", () => {
    const email = buildFollowupEmail("top_fixes", base);
    expect(email.subject).toContain("3 quick fixes");
    expect(email.html).toContain(
      "Ask happy customers for a Google review the day of service.",
    );
    expect(email.html).toContain("Reply to every review to build trust.");
    expect(email.html).toContain(pdfUrl(REQUEST_ID));
  });

  it("top_fixes email falls back to defaults with no recommendations", () => {
    const email = buildFollowupEmail("top_fixes", {
      ...base,
      report: makeReport({ recommendations: [] }),
    });
    expect(email.html).toContain("Ask every happy customer");
  });

  it("final_conversion email includes score and strong CTA", () => {
    const email = buildFollowupEmail("final_conversion", base);
    expect(email.subject).toContain("more calls");
    expect(email.html).toContain("72/100");
    expect(email.html).toContain("Start 7-day free trial");
    expect(email.html).toContain("Book a demo");
  });

  it("every follow-up email carries opt-out copy", () => {
    for (const key of ["competitor_gap", "top_fixes", "final_conversion"] as const) {
      const email = buildFollowupEmail(key, base);
      expect(email.html.toLowerCase()).toContain("unsubscribe");
      expect(email.text.toLowerCase()).toContain("unsubscribe");
    }
  });
});
