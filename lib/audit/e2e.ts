import "server-only";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLeads, auditRequests, funnelEvents } from "@/lib/db/schema";
import {
  createAudit,
  extractReport,
  getAuditByLeadId,
  getAuditLeadById,
} from "./leads";
import { sendAuditReportEmail } from "./email";
import { pdfUrl, resultsUrl, APP_URL } from "./email-content";
import { recordFunnelEvent } from "@/lib/analytics/funnel";
import { inngest } from "@/lib/inngest/client";
import {
  assertCleanableTestLead,
  buildChecklist,
  checklistPassed,
  classifyPdfHealth,
  withE2EPrefix,
  type ChecklistItem,
  type PdfHealth,
} from "./e2e-core";

// ---------------------------------------------------------------------------
// PDF health check (real HTTP GET against the public PDF route)
// ---------------------------------------------------------------------------

export async function checkPdfHealth(
  requestId: string,
  opts: { baseUrl?: string; fetchImpl?: typeof fetch } = {},
): Promise<PdfHealth> {
  const base = (opts.baseUrl ?? APP_URL).replace(/\/$/, "");
  const doFetch = opts.fetchImpl ?? fetch;
  try {
    const res = await doFetch(`${base}/api/audit/${requestId}/pdf`, {
      method: "GET",
    });
    const buf = await res.arrayBuffer();
    return classifyPdfHealth({
      status: res.status,
      contentType: res.headers.get("content-type"),
      byteLength: buf.byteLength,
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      contentType: null,
      bytes: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function countFunnelEventsForLead(leadId: string): Promise<number> {
  const rows = await db
    .select({ id: funnelEvents.id })
    .from(funnelEvents)
    .where(eq(funnelEvents.auditLeadId, leadId));
  return rows.length;
}

// ---------------------------------------------------------------------------
// Run a test audit
// ---------------------------------------------------------------------------

export type RunE2EInput = {
  businessName: string;
  email: string;
  city?: string | null;
  phone?: string | null;
};

export type E2ETestResult = {
  ok: boolean;
  leadId: string | null;
  requestId: string | null;
  businessName: string;
  resultsUrl: string | null;
  pdfUrl: string | null;
  checklist: ChecklistItem[];
  error?: string;
};

/** Injectable collaborators so the orchestration is testable without mocks. */
export type RunE2EDeps = {
  createAudit: typeof createAudit;
  recordFunnelEvent: typeof recordFunnelEvent;
  sendReportEmail: typeof sendAuditReportEmail;
  dispatchFollowup: (args: {
    leadId: string;
    requestId: string;
  }) => Promise<{ dispatched: boolean; error?: string }>;
  checkPdf: (requestId: string) => Promise<PdfHealth>;
  countFunnelEvents: (leadId: string) => Promise<number>;
};

const defaultDeps: RunE2EDeps = {
  createAudit,
  recordFunnelEvent,
  sendReportEmail: sendAuditReportEmail,
  dispatchFollowup: async ({ leadId, requestId }) => {
    try {
      await inngest.send({
        name: "audit/lead.created",
        data: { leadId, requestId },
      });
      return { dispatched: true };
    } catch (err) {
      return {
        dispatched: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
  checkPdf: (requestId) => checkPdfHealth(requestId),
  countFunnelEvents: countFunnelEventsForLead,
};

/**
 * Run a production-like free audit end-to-end as an admin test, recording the
 * same funnel events the public route does (tagged `e2e: true`), then verify
 * every funnel step and return a checklist. The created records are clearly
 * marked as test data (business-name prefix) and removable via cleanup.
 */
export async function runE2EAuditTest(
  input: RunE2EInput,
  deps: Partial<RunE2EDeps> = {},
): Promise<E2ETestResult> {
  const d = { ...defaultDeps, ...deps };
  const businessName = withE2EPrefix(input.businessName);
  const email = input.email.trim();

  await d.recordFunnelEvent({
    type: "audit_started",
    metadata: { e2e: true, business_name: businessName },
  });

  let record;
  try {
    record = await d.createAudit({
      businessName,
      email,
      city: input.city ?? null,
      phone: input.phone ?? null,
      source: "admin-e2e-test",
    });
  } catch (err) {
    return {
      ok: false,
      leadId: null,
      requestId: null,
      businessName,
      resultsUrl: null,
      pdfUrl: null,
      checklist: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const { lead, request, report } = record;

  await d.recordFunnelEvent({
    type: "audit_completed",
    leadId: lead.id,
    requestId: request.id,
    metadata: { e2e: true, score: report.score, grade: report.grade },
  });

  const results = resultsUrl(request.id);
  const pdf = pdfUrl(request.id);

  // Immediate email (fixture in dev). Mirror the route: never let a send
  // failure abort the test — we record and report it instead.
  const email_ = { attempted: true, ok: false, fixture: false, error: undefined as string | undefined };
  try {
    const res = await d.sendReportEmail({
      to: email,
      businessName,
      requestId: request.id,
      report,
      googleRating: lead.googleRating,
      googleReviewCount: lead.googleReviewCount,
    });
    email_.ok = res.ok;
    email_.fixture = res.fixture;
    email_.error = res.error;
    await d.recordFunnelEvent({
      type: res.ok ? "audit_email_sent" : "audit_email_failed",
      leadId: lead.id,
      requestId: request.id,
      metadata: { e2e: true, fixture: res.fixture, error: res.error ?? null },
    });
  } catch (err) {
    email_.error = err instanceof Error ? err.message : String(err);
    await d.recordFunnelEvent({
      type: "audit_email_failed",
      leadId: lead.id,
      requestId: request.id,
      metadata: { e2e: true, error: email_.error },
    });
  }

  const inngestResult = await d.dispatchFollowup({
    leadId: lead.id,
    requestId: request.id,
  });

  const pdfHealth = await d.checkPdf(request.id);

  const funnelEventCount = await d.countFunnelEvents(lead.id);

  const checklist = buildChecklist({
    leadCreated: true,
    payloadStored: !!request.reportJson,
    placeId: lead.placeId,
    googleRating: lead.googleRating,
    googleReviewCount: lead.googleReviewCount,
    resultsUrl: results,
    pdfUrl: pdf,
    pdfHealth,
    email: email_,
    inngest: inngestResult,
    funnelEventCount,
  });

  return {
    ok: checklistPassed(checklist),
    leadId: lead.id,
    requestId: request.id,
    businessName,
    resultsUrl: results,
    pdfUrl: pdf,
    checklist,
  };
}

// ---------------------------------------------------------------------------
// Cleanup (scoped + guarded)
// ---------------------------------------------------------------------------

export type CleanupResult = {
  ok: boolean;
  leadId: string;
  businessName: string;
  funnelEventsDeleted: number;
  requestsDeleted: number;
  leadDeleted: boolean;
};

/** Injectable data access so the guard + scoping are testable without drizzle. */
export type CleanupDeps = {
  getLead: (leadId: string) => Promise<{ id: string; businessName: string } | null>;
  getRequestIds: (leadId: string) => Promise<string[]>;
  deleteFunnelEvents: (leadId: string, requestIds: string[]) => Promise<number>;
  deleteRequests: (leadId: string) => Promise<number>;
  deleteLead: (leadId: string) => Promise<number>;
};

const defaultCleanupDeps: CleanupDeps = {
  getLead: getAuditLeadById,
  getRequestIds: async (leadId) => {
    const rows = await db
      .select({ id: auditRequests.id })
      .from(auditRequests)
      .where(eq(auditRequests.auditLeadId, leadId));
    return rows.map((r) => r.id);
  },
  deleteFunnelEvents: async (leadId, requestIds) => {
    // Scope strictly to this lead and its requests — never a blanket delete.
    const condition =
      requestIds.length > 0
        ? or(
            eq(funnelEvents.auditLeadId, leadId),
            inArray(funnelEvents.auditRequestId, requestIds),
          )
        : eq(funnelEvents.auditLeadId, leadId);
    const rows = await db
      .delete(funnelEvents)
      .where(condition)
      .returning({ id: funnelEvents.id });
    return rows.length;
  },
  deleteRequests: async (leadId) => {
    const rows = await db
      .delete(auditRequests)
      .where(eq(auditRequests.auditLeadId, leadId))
      .returning({ id: auditRequests.id });
    return rows.length;
  },
  deleteLead: async (leadId) => {
    const rows = await db
      .delete(auditLeads)
      // Belt-and-braces: id match (the guard above already proved it's a test
      // lead, but scope every delete explicitly to this single id).
      .where(and(eq(auditLeads.id, leadId)))
      .returning({ id: auditLeads.id });
    return rows.length;
  },
};

/**
 * Delete a single E2E test lead and everything scoped to it (funnel events,
 * audit requests, the lead row). Refuses — by throwing — to touch any lead that
 * isn't clearly marked as a test lead, so real captured leads are never at risk.
 */
export async function cleanupE2ETestLead(
  leadId: string,
  deps: Partial<CleanupDeps> = {},
): Promise<CleanupResult> {
  const d = { ...defaultCleanupDeps, ...deps };

  const lead = await d.getLead(leadId);
  // Hard safety barrier — throws E2ELeadNotFoundError / E2ENotATestLeadError.
  assertCleanableTestLead(lead, leadId);

  const requestIds = await d.getRequestIds(leadId);
  const funnelEventsDeleted = await d.deleteFunnelEvents(leadId, requestIds);
  const requestsDeleted = await d.deleteRequests(leadId);
  const leadDeleted = (await d.deleteLead(leadId)) > 0;

  return {
    ok: leadDeleted,
    leadId,
    businessName: lead.businessName,
    funnelEventsDeleted,
    requestsDeleted,
    leadDeleted,
  };
}

export { getAuditByLeadId };
