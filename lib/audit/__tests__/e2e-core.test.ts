import { describe, it, expect } from "vitest";
import {
  E2E_TEST_PREFIX,
  withE2EPrefix,
  stripE2EPrefix,
  isE2ETestBusinessName,
  isE2ETestLead,
  assertCleanableTestLead,
  E2ELeadNotFoundError,
  E2ENotATestLeadError,
  classifyPdfHealth,
  buildChecklist,
  checklistPassed,
  type ChecklistFacts,
} from "../e2e-core";

describe("E2E naming + guards", () => {
  it("prefixes a plain business name once", () => {
    const name = withE2EPrefix("Smith HVAC");
    expect(name).toBe(`${E2E_TEST_PREFIX} Smith HVAC`);
  });

  it("does not double-prefix", () => {
    const once = withE2EPrefix("Smith HVAC");
    expect(withE2EPrefix(once)).toBe(once);
  });

  it("collapses whitespace and falls back for blank names", () => {
    expect(withE2EPrefix("  Smith   HVAC ")).toBe(`${E2E_TEST_PREFIX} Smith HVAC`);
    expect(withE2EPrefix("   ")).toBe(`${E2E_TEST_PREFIX} Unnamed`);
  });

  it("identifies test business names", () => {
    expect(isE2ETestBusinessName(`${E2E_TEST_PREFIX} Foo`)).toBe(true);
    expect(isE2ETestBusinessName("Foo")).toBe(false);
    expect(isE2ETestBusinessName(null)).toBe(false);
  });

  it("identifies test leads", () => {
    expect(isE2ETestLead({ businessName: `${E2E_TEST_PREFIX} Foo` })).toBe(true);
    expect(isE2ETestLead({ businessName: "Real Co" })).toBe(false);
    expect(isE2ETestLead(null)).toBe(false);
  });

  it("strips the E2E prefix for external lookups", () => {
    expect(stripE2EPrefix(`${E2E_TEST_PREFIX} Smith HVAC`)).toBe("Smith HVAC");
  });

  it("returns non-prefixed names unchanged", () => {
    expect(stripE2EPrefix("Real Business")).toBe("Real Business");
  });

  it("handles whitespace around the prefix", () => {
    expect(stripE2EPrefix(`  ${E2E_TEST_PREFIX}  Smith HVAC  `)).toBe("Smith HVAC");
  });

  it("returns the full string if stripping would leave it empty", () => {
    expect(stripE2EPrefix(E2E_TEST_PREFIX)).toBe(E2E_TEST_PREFIX);
  });

  it("round-trips: withE2EPrefix then stripE2EPrefix returns the original", () => {
    const original = "Smith HVAC";
    expect(stripE2EPrefix(withE2EPrefix(original))).toBe(original);
  });
});

describe("assertCleanableTestLead", () => {
  it("passes for a test lead", () => {
    expect(() =>
      assertCleanableTestLead({ businessName: `${E2E_TEST_PREFIX} Foo` }, "id"),
    ).not.toThrow();
  });

  it("throws E2ELeadNotFoundError for null", () => {
    expect(() => assertCleanableTestLead(null, "id-1")).toThrow(
      E2ELeadNotFoundError,
    );
  });

  it("throws E2ENotATestLeadError for a real lead (never deletes it)", () => {
    expect(() =>
      assertCleanableTestLead({ businessName: "Real Plumbing Co" }, "id-2"),
    ).toThrow(E2ENotATestLeadError);
  });
});

describe("classifyPdfHealth", () => {
  it("ok when 200 + pdf content-type + non-empty", () => {
    const h = classifyPdfHealth({
      status: 200,
      contentType: "application/pdf",
      byteLength: 2048,
    });
    expect(h.ok).toBe(true);
    expect(h.error).toBeUndefined();
  });

  it("fails on non-200", () => {
    const h = classifyPdfHealth({ status: 404, contentType: "application/json", byteLength: 30 });
    expect(h.ok).toBe(false);
    expect(h.error).toContain("404");
  });

  it("fails on wrong content-type", () => {
    const h = classifyPdfHealth({ status: 200, contentType: "text/html", byteLength: 100 });
    expect(h.ok).toBe(false);
    expect(h.error).toContain("content-type");
  });

  it("fails on empty body", () => {
    const h = classifyPdfHealth({ status: 200, contentType: "application/pdf", byteLength: 0 });
    expect(h.ok).toBe(false);
    expect(h.error).toContain("Empty");
  });
});

function baseFacts(overrides: Partial<ChecklistFacts> = {}): ChecklistFacts {
  return {
    leadCreated: true,
    payloadStored: true,
    placeId: "place_123",
    googleRating: 4.3,
    googleReviewCount: 87,
    resultsUrl: "https://app/free-audit/results/r1",
    pdfUrl: "https://app/api/audit/r1/pdf",
    pdfHealth: { ok: true, status: 200, contentType: "application/pdf", bytes: 1000 },
    email: { attempted: true, ok: true, fixture: false },
    inngest: { dispatched: true },
    funnelEventCount: 3,
    ...overrides,
  };
}

describe("buildChecklist", () => {
  it("all-pass for a healthy run", () => {
    const items = buildChecklist(baseFacts());
    expect(checklistPassed(items)).toBe(true);
    const byKey = Object.fromEntries(items.map((i) => [i.key, i.status]));
    expect(byKey.lead_created).toBe("ok");
    expect(byKey.payload_stored).toBe("ok");
    expect(byKey.google_places).toBe("ok");
    expect(byKey.pdf_route).toBe("ok");
    expect(byKey.email).toBe("ok");
    expect(byKey.inngest).toBe("ok");
    expect(byKey.funnel).toBe("ok");
  });

  it("marks places as skip in sample mode", () => {
    const items = buildChecklist(
      baseFacts({ placeId: null, googleRating: null, googleReviewCount: null }),
    );
    const places = items.find((i) => i.key === "google_places")!;
    expect(places.status).toBe("skip");
    // sample mode is not a failure
    expect(checklistPassed(items)).toBe(true);
  });

  it("marks fixture email as skip, not fail", () => {
    const items = buildChecklist(
      baseFacts({ email: { attempted: true, ok: true, fixture: true } }),
    );
    expect(items.find((i) => i.key === "email")!.status).toBe("skip");
    expect(checklistPassed(items)).toBe(true);
  });

  it("fails when PDF route is unhealthy", () => {
    const items = buildChecklist(
      baseFacts({
        pdfHealth: { ok: false, status: 500, contentType: null, bytes: 0, error: "HTTP 500" },
      }),
    );
    expect(items.find((i) => i.key === "pdf_route")!.status).toBe("fail");
    expect(checklistPassed(items)).toBe(false);
  });

  it("fails when no funnel events recorded", () => {
    const items = buildChecklist(baseFacts({ funnelEventCount: 0 }));
    expect(items.find((i) => i.key === "funnel")!.status).toBe("fail");
    expect(checklistPassed(items)).toBe(false);
  });

  it("skips inngest when not dispatched (not a failure)", () => {
    const items = buildChecklist(
      baseFacts({ inngest: { dispatched: false, error: "no key" } }),
    );
    expect(items.find((i) => i.key === "inngest")!.status).toBe("skip");
    expect(checklistPassed(items)).toBe(true);
  });
});
