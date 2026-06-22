import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ db: {}, schema: {} }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: vi.fn() } }));

import {
  runE2EAuditTest,
  cleanupE2ETestLead,
  type RunE2EDeps,
  type CleanupDeps,
} from "../e2e";
import { E2E_TEST_PREFIX, E2ELeadNotFoundError, E2ENotATestLeadError } from "../e2e-core";
import type { AuditLead, AuditRequest } from "@/lib/db/schema";
import type { ReputationReport } from "../score";

function makeLead(overrides: Partial<AuditLead> = {}): AuditLead {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    businessName: `${E2E_TEST_PREFIX} QA Co`,
    email: "qa@autofivestar.com",
    website: null,
    gbpUrl: null,
    industry: null,
    city: "Austin, TX",
    phone: null,
    source: "admin-e2e-test",
    placeId: "place_1",
    googleRating: 4.3,
    googleReviewCount: 87,
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
    ...overrides,
  };
}

function makeRequest(overrides: Partial<AuditRequest> = {}): AuditRequest {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    auditLeadId: "11111111-1111-1111-1111-111111111111",
    status: "completed",
    score: 72,
    reportJson: { report: {} },
    demoMode: false,
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
    ...overrides,
  };
}

function makeReport(): ReputationReport {
  return {
    score: 72,
    grade: "C",
    breakdown: { rating: 34, volume: 9, recency: 0, response: 0 },
    strengths: [],
    opportunities: [],
    recommendations: ["Reply to reviews."],
  };
}

function runDeps(over: Partial<RunE2EDeps> = {}): RunE2EDeps {
  return {
    createAudit: vi.fn(async () => ({
      lead: makeLead(),
      request: makeRequest(),
      report: makeReport(),
      rationale: "r",
    })),
    recordFunnelEvent: vi.fn(async () => {}),
    sendReportEmail: vi.fn(async () => ({ ok: true, fixture: true, providerId: null })),
    dispatchFollowup: vi.fn(async () => ({ dispatched: true })),
    checkPdf: vi.fn(async () => ({
      ok: true,
      status: 200,
      contentType: "application/pdf",
      bytes: 1024,
    })),
    countFunnelEvents: vi.fn(async () => 3),
    ...over,
  };
}

describe("runE2EAuditTest", () => {
  it("runs the full path and returns a passing checklist", async () => {
    const deps = runDeps();
    const result = await runE2EAuditTest(
      { businessName: "QA Co", email: "qa@autofivestar.com", city: "Austin, TX" },
      deps,
    );

    expect(result.ok).toBe(true);
    expect(result.leadId).toBe("11111111-1111-1111-1111-111111111111");
    expect(result.requestId).toBe("22222222-2222-2222-2222-222222222222");
    expect(result.resultsUrl).toContain("/free-audit/results/");
    expect(result.pdfUrl).toContain("/api/audit/");
    expect(result.pdfUrl).toContain("/pdf");
    // checklist surfaces the PDF health check
    expect(result.checklist.find((i) => i.key === "pdf_route")!.status).toBe("ok");
  });

  it("forces the E2E prefix and test source on the created lead", async () => {
    const deps = runDeps();
    await runE2EAuditTest({ businessName: "Plain Name", email: "qa@x.com" }, deps);

    expect(deps.createAudit).toHaveBeenCalledTimes(1);
    const arg = (deps.createAudit as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(arg.businessName).toBe(`${E2E_TEST_PREFIX} Plain Name`);
    expect(arg.source).toBe("admin-e2e-test");
  });

  it("records funnel events for the run", async () => {
    const deps = runDeps();
    await runE2EAuditTest({ businessName: "QA Co", email: "qa@x.com" }, deps);
    const types = (deps.recordFunnelEvent as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0].type,
    );
    expect(types).toContain("audit_started");
    expect(types).toContain("audit_completed");
    expect(types).toContain("audit_email_sent");
  });

  it("returns an error result (no throw) when audit creation fails", async () => {
    const deps = runDeps({
      createAudit: vi.fn(async () => {
        throw new Error("places exploded");
      }),
    });
    const result = await runE2EAuditTest({ businessName: "QA Co", email: "qa@x.com" }, deps);
    expect(result.ok).toBe(false);
    expect(result.leadId).toBeNull();
    expect(result.error).toContain("places exploded");
  });

  it("still completes when the PDF check fails (reports it in the checklist)", async () => {
    const deps = runDeps({
      checkPdf: vi.fn(async () => ({
        ok: false,
        status: 500,
        contentType: null,
        bytes: 0,
        error: "HTTP 500",
      })),
    });
    const result = await runE2EAuditTest({ businessName: "QA Co", email: "qa@x.com" }, deps);
    expect(result.ok).toBe(false);
    expect(result.checklist.find((i) => i.key === "pdf_route")!.status).toBe("fail");
  });
});

function cleanupDeps(over: Partial<CleanupDeps> = {}): CleanupDeps {
  return {
    getLead: vi.fn(async () => ({ id: "lead-1", businessName: `${E2E_TEST_PREFIX} QA Co` })),
    getRequestIds: vi.fn(async () => ["req-1", "req-2"]),
    deleteFunnelEvents: vi.fn(async () => 5),
    deleteRequests: vi.fn(async () => 2),
    deleteLead: vi.fn(async () => 1),
    ...over,
  };
}

describe("cleanupE2ETestLead", () => {
  it("deletes funnel events, requests, and the lead — all scoped to the lead id", async () => {
    const deps = cleanupDeps();
    const result = await cleanupE2ETestLead("lead-1", deps);

    expect(result.ok).toBe(true);
    expect(result.funnelEventsDeleted).toBe(5);
    expect(result.requestsDeleted).toBe(2);
    expect(result.leadDeleted).toBe(true);

    expect(deps.deleteFunnelEvents).toHaveBeenCalledWith("lead-1", ["req-1", "req-2"]);
    expect(deps.deleteRequests).toHaveBeenCalledWith("lead-1");
    expect(deps.deleteLead).toHaveBeenCalledWith("lead-1");
  });

  it("refuses to clean a non-test lead and performs NO deletes", async () => {
    const deps = cleanupDeps({
      getLead: vi.fn(async () => ({ id: "lead-x", businessName: "Real Plumbing Co" })),
    });

    await expect(cleanupE2ETestLead("lead-x", deps)).rejects.toBeInstanceOf(
      E2ENotATestLeadError,
    );

    expect(deps.deleteFunnelEvents).not.toHaveBeenCalled();
    expect(deps.deleteRequests).not.toHaveBeenCalled();
    expect(deps.deleteLead).not.toHaveBeenCalled();
  });

  it("throws not-found and performs no deletes when the lead is missing", async () => {
    const deps = cleanupDeps({ getLead: vi.fn(async () => null) });

    await expect(cleanupE2ETestLead("missing", deps)).rejects.toBeInstanceOf(
      E2ELeadNotFoundError,
    );
    expect(deps.deleteLead).not.toHaveBeenCalled();
  });
});
