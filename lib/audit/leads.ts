import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  auditLeads,
  auditRequests,
  type AuditLead,
  type AuditRequest,
} from "@/lib/db/schema";
import {
  buildDemoInputs,
  computeReputationReport,
  type ReputationReport,
} from "./score";

export type CreateAuditInput = {
  businessName: string;
  email: string;
  website?: string | null;
  gbpUrl?: string | null;
  industry?: string | null;
  source?: string | null;
};

export type AuditRecord = {
  lead: AuditLead;
  request: AuditRequest;
  report: ReputationReport;
  rationale: string;
};

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

export class AuditRateLimitError extends Error {
  constructor() {
    super("Too many audits requested for this email. Try again in an hour.");
    this.name = "AuditRateLimitError";
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function isRateLimited(email: string): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const rows = await db
    .select({ id: auditLeads.id })
    .from(auditLeads)
    .where(
      and(eq(auditLeads.email, email), gte(auditLeads.createdAt, since)),
    );
  return rows.length >= RATE_LIMIT_MAX;
}

/**
 * Create an audit lead + audit request, compute the report, persist results.
 * Always returns a usable record (demo mode when we lack live review data).
 */
export async function createAudit(
  input: CreateAuditInput,
): Promise<AuditRecord> {
  const email = normalizeEmail(input.email);
  if (await isRateLimited(email)) throw new AuditRateLimitError();

  const businessName = input.businessName.trim();
  if (businessName.length === 0) {
    throw new Error("Business name required");
  }

  const insertedLeads = await db
    .insert(auditLeads)
    .values({
      businessName,
      email,
      website: input.website?.trim() || null,
      gbpUrl: input.gbpUrl?.trim() || null,
      industry: input.industry?.trim() || null,
      source: input.source ?? "website",
    })
    .returning();
  const lead = insertedLeads[0];
  if (!lead) throw new Error("Failed to create audit lead");

  const seed = `${businessName.toLowerCase()}|${email}|${lead.id}`;
  const { inputs, rationale } = buildDemoInputs(seed);
  const report = computeReputationReport(inputs);

  const insertedRequests = await db
    .insert(auditRequests)
    .values({
      auditLeadId: lead.id,
      status: "completed",
      score: report.score,
      reportJson: {
        report,
        inputs: {
          averageRating: inputs.averageRating,
          reviewCount: inputs.reviewCount,
          lastReviewAt: inputs.lastReviewAt?.toISOString() ?? null,
          responseRate: inputs.responseRate,
        },
        rationale,
        version: "v1",
      } as Record<string, unknown>,
      demoMode: true,
    })
    .returning();
  const request = insertedRequests[0];
  if (!request) throw new Error("Failed to create audit request");

  return { lead, request, report, rationale };
}

export type AuditResultRow = {
  lead: AuditLead;
  request: AuditRequest;
};

export async function getAuditByRequestId(
  requestId: string,
): Promise<AuditResultRow | null> {
  const rows = await db
    .select({ lead: auditLeads, request: auditRequests })
    .from(auditRequests)
    .innerJoin(auditLeads, eq(auditLeads.id, auditRequests.auditLeadId))
    .where(eq(auditRequests.id, requestId))
    .limit(1);
  return rows[0] ?? null;
}

export function extractReport(request: AuditRequest): {
  report: ReputationReport | null;
  rationale: string | null;
} {
  const payload = request.reportJson as
    | { report?: ReputationReport; rationale?: string }
    | null;
  return {
    report: payload?.report ?? null,
    rationale: payload?.rationale ?? null,
  };
}
