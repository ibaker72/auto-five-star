import { describe, it, expect } from "vitest";
import {
  followupIdempotencyKey,
  isEmailSendable,
  planFollowupSend,
  type FollowupLeadLike,
} from "../followup-plan";
import type { ReputationReport } from "../score";

function makeReport(): ReputationReport {
  return {
    score: 72,
    grade: "C",
    breakdown: { rating: 34, volume: 9, recency: 0, response: 0 },
    strengths: [],
    opportunities: [],
    recommendations: ["Reply to every review."],
  };
}

function makeLead(overrides: Partial<FollowupLeadLike> = {}): FollowupLeadLike {
  return {
    email: "owner@smithhvac.com",
    businessName: "Smith HVAC",
    googleRating: 4.2,
    googleReviewCount: 87,
    ...overrides,
  };
}

const REQUEST = { id: "44444444-4444-4444-4444-444444444444" };

describe("isEmailSendable", () => {
  it("accepts a well-formed email", () => {
    expect(isEmailSendable("owner@smithhvac.com")).toBe(true);
  });

  it("rejects null, empty, and malformed addresses", () => {
    expect(isEmailSendable(null)).toBe(false);
    expect(isEmailSendable(undefined)).toBe(false);
    expect(isEmailSendable("")).toBe(false);
    expect(isEmailSendable("not-an-email")).toBe(false);
    expect(isEmailSendable("missing@domain")).toBe(false);
  });
});

describe("followupIdempotencyKey", () => {
  it("is stable for the same lead (prevents duplicate sequences)", () => {
    const a = followupIdempotencyKey("lead-123");
    const b = followupIdempotencyKey("lead-123");
    expect(a).toBe(b);
    expect(a).toBe("audit-followup:lead-123");
  });

  it("differs across leads", () => {
    expect(followupIdempotencyKey("lead-1")).not.toBe(
      followupIdempotencyKey("lead-2"),
    );
  });
});

describe("planFollowupSend", () => {
  it("plans a send when lead, request, report, and email are present", () => {
    const plan = planFollowupSend({
      key: "competitor_gap",
      lead: makeLead(),
      request: REQUEST,
      report: makeReport(),
    });
    expect(plan.action).toBe("send");
    if (plan.action === "send") {
      expect(plan.to).toBe("owner@smithhvac.com");
      expect(plan.key).toBe("competitor_gap");
      expect(plan.content.businessName).toBe("Smith HVAC");
      expect(plan.content.requestId).toBe(REQUEST.id);
      expect(plan.content.googleRating).toBe(4.2);
    }
  });

  it("skips when the lead is missing", () => {
    const plan = planFollowupSend({
      key: "top_fixes",
      lead: null,
      request: REQUEST,
      report: makeReport(),
    });
    expect(plan).toEqual({ action: "skip", reason: "missing_lead" });
  });

  it("skips when the request is missing", () => {
    const plan = planFollowupSend({
      key: "top_fixes",
      lead: makeLead(),
      request: null,
      report: makeReport(),
    });
    expect(plan).toEqual({ action: "skip", reason: "missing_request" });
  });

  it("skips when the report is missing", () => {
    const plan = planFollowupSend({
      key: "top_fixes",
      lead: makeLead(),
      request: REQUEST,
      report: null,
    });
    expect(plan).toEqual({ action: "skip", reason: "missing_report" });
  });

  it("skips when the email is missing (no send on missing email)", () => {
    const plan = planFollowupSend({
      key: "final_conversion",
      lead: makeLead({ email: null }),
      request: REQUEST,
      report: makeReport(),
    });
    expect(plan).toEqual({ action: "skip", reason: "missing_email" });
  });

  it("skips when the email is malformed", () => {
    const plan = planFollowupSend({
      key: "final_conversion",
      lead: makeLead({ email: "nope" }),
      request: REQUEST,
      report: makeReport(),
    });
    expect(plan).toEqual({ action: "skip", reason: "missing_email" });
  });

  it("trims whitespace from the recipient email", () => {
    const plan = planFollowupSend({
      key: "competitor_gap",
      lead: makeLead({ email: "  owner@smithhvac.com  " }),
      request: REQUEST,
      report: makeReport(),
    });
    expect(plan.action).toBe("send");
    if (plan.action === "send") {
      expect(plan.to).toBe("owner@smithhvac.com");
    }
  });
});
