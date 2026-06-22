/**
 * Pure logic for the admin Live Audit E2E test tool — no `server-only`, no DB,
 * no network. Naming/guards, the PDF health classifier, and the checklist
 * builder all live here so they can be unit-tested without mocking the world.
 *
 * Safety model: every test lead's business name is prefixed with
 * `E2E_TEST_PREFIX`. Cleanup refuses to touch any lead whose name doesn't carry
 * that prefix, so a real captured lead can never be deleted by this tool.
 */

export const E2E_TEST_PREFIX = "E2E Test —";

/** Apply the E2E prefix exactly once, trimming and collapsing whitespace. */
export function withE2EPrefix(businessName: string): string {
  const trimmed = businessName.trim().replace(/\s+/g, " ");
  if (isE2ETestBusinessName(trimmed)) return trimmed;
  const base = trimmed.length > 0 ? trimmed : "Unnamed";
  return `${E2E_TEST_PREFIX} ${base}`;
}

export function isE2ETestBusinessName(name: string | null | undefined): boolean {
  if (!name) return false;
  return name.trim().startsWith(E2E_TEST_PREFIX);
}

/** The single safety gate used by cleanup. Operates on anything name-shaped. */
export function isE2ETestLead(
  lead: { businessName: string } | null | undefined,
): boolean {
  return !!lead && isE2ETestBusinessName(lead.businessName);
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class E2ELeadNotFoundError extends Error {
  constructor(leadId: string) {
    super(`E2E lead not found: ${leadId}`);
    this.name = "E2ELeadNotFoundError";
  }
}

/** Thrown when cleanup is asked to delete a lead that is NOT a test lead. */
export class E2ENotATestLeadError extends Error {
  constructor(businessName: string) {
    super(
      `Refusing to clean up "${businessName}": not an E2E test lead ` +
        `(missing "${E2E_TEST_PREFIX}" prefix).`,
    );
    this.name = "E2ENotATestLeadError";
  }
}

/**
 * Guard used before any destructive cleanup. Narrows the lead to non-null and
 * asserts it is a test lead, otherwise throws. This is the hard safety barrier
 * that prevents the tool from ever deleting a non-test lead.
 */
export function assertCleanableTestLead<T extends { businessName: string }>(
  lead: T | null | undefined,
  leadId: string,
): asserts lead is T {
  if (!lead) throw new E2ELeadNotFoundError(leadId);
  if (!isE2ETestLead(lead)) throw new E2ENotATestLeadError(lead.businessName);
}

// ---------------------------------------------------------------------------
// PDF health classifier
// ---------------------------------------------------------------------------

export type PdfHealth = {
  ok: boolean;
  status: number;
  contentType: string | null;
  bytes: number;
  error?: string;
};

/** Classify a PDF route response into a health verdict. Pure. */
export function classifyPdfHealth(input: {
  status: number;
  contentType: string | null;
  byteLength: number;
}): PdfHealth {
  const isPdf = (input.contentType ?? "")
    .toLowerCase()
    .includes("application/pdf");
  const ok = input.status === 200 && isPdf && input.byteLength > 0;
  let error: string | undefined;
  if (!ok) {
    if (input.status !== 200) error = `HTTP ${input.status}`;
    else if (!isPdf) error = `Unexpected content-type: ${input.contentType ?? "none"}`;
    else error = "Empty PDF body";
  }
  return {
    ok,
    status: input.status,
    contentType: input.contentType,
    bytes: input.byteLength,
    error,
  };
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export type ChecklistStatus = "ok" | "skip" | "fail" | "info";

export type ChecklistItem = {
  key: string;
  label: string;
  status: ChecklistStatus;
  detail: string;
};

export type ChecklistFacts = {
  leadCreated: boolean;
  payloadStored: boolean;
  placeId: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  resultsUrl: string | null;
  pdfUrl: string | null;
  pdfHealth: PdfHealth | null;
  email: { attempted: boolean; ok: boolean; fixture: boolean; error?: string };
  inngest: { dispatched: boolean; error?: string };
  funnelEventCount: number;
};

/** Build the ordered status checklist shown to the admin. Pure. */
export function buildChecklist(facts: ChecklistFacts): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  items.push({
    key: "lead_created",
    label: "Audit lead created",
    status: facts.leadCreated ? "ok" : "fail",
    detail: facts.leadCreated ? "Lead row inserted" : "No lead was created",
  });

  items.push({
    key: "payload_stored",
    label: "Audit payload stored",
    status: facts.payloadStored ? "ok" : "fail",
    detail: facts.payloadStored
      ? "Audit request + report JSON persisted"
      : "Audit request/report missing",
  });

  const hasPlaces =
    !!facts.placeId ||
    facts.googleRating !== null ||
    facts.googleReviewCount !== null;
  items.push({
    key: "google_places",
    label: "Google Places data captured",
    status: hasPlaces ? "ok" : "skip",
    detail: hasPlaces
      ? `rating=${facts.googleRating ?? "—"}, reviews=${facts.googleReviewCount ?? "—"}`
      : "No Places key/match — ran in sample mode",
  });

  items.push({
    key: "results_url",
    label: "Result page URL generated",
    status: facts.resultsUrl ? "ok" : "fail",
    detail: facts.resultsUrl ?? "Not generated",
  });

  items.push({
    key: "pdf_url",
    label: "PDF URL generated",
    status: facts.pdfUrl ? "ok" : "fail",
    detail: facts.pdfUrl ?? "Not generated",
  });

  if (facts.pdfHealth) {
    items.push({
      key: "pdf_route",
      label: "PDF route returns 200",
      status: facts.pdfHealth.ok ? "ok" : "fail",
      detail: facts.pdfHealth.ok
        ? `200 OK, ${facts.pdfHealth.bytes} bytes`
        : (facts.pdfHealth.error ?? "PDF check failed"),
    });
  } else {
    items.push({
      key: "pdf_route",
      label: "PDF route returns 200",
      status: "skip",
      detail: "PDF health check not run",
    });
  }

  if (!facts.email.attempted) {
    items.push({
      key: "email",
      label: "Immediate email",
      status: "skip",
      detail: "Not attempted",
    });
  } else if (facts.email.ok) {
    items.push({
      key: "email",
      label: "Immediate email",
      status: facts.email.fixture ? "skip" : "ok",
      detail: facts.email.fixture
        ? "Fixture mode (EMAIL_LIVE off) — logged, not sent"
        : "Sent via Resend",
    });
  } else {
    items.push({
      key: "email",
      label: "Immediate email",
      status: "fail",
      detail: facts.email.error ?? "Send failed",
    });
  }

  items.push({
    key: "inngest",
    label: "Inngest follow-up event dispatched",
    status: facts.inngest.dispatched ? "ok" : "skip",
    detail: facts.inngest.dispatched
      ? "audit/lead.created sent"
      : (facts.inngest.error ?? "Not dispatched (Inngest unavailable)"),
  });

  items.push({
    key: "funnel",
    label: "Funnel events recorded",
    status: facts.funnelEventCount > 0 ? "ok" : "fail",
    detail: `${facts.funnelEventCount} event(s) recorded for this lead`,
  });

  return items;
}

export function checklistPassed(items: ChecklistItem[]): boolean {
  return !items.some((i) => i.status === "fail");
}
