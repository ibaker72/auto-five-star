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
  buildCompetitorComparison,
  buildDemoInputs,
  computeRealReputationReport,
  computeReputationReport,
  type CompetitorStat,
  type ReputationReport,
} from "./score";
import {
  findBusinessOnPlaces,
  findCompetitors,
  type PlaceMatch,
} from "@/lib/integrations/google-places";

export type CreateAuditInput = {
  businessName: string;
  email: string;
  website?: string | null;
  gbpUrl?: string | null;
  industry?: string | null;
  city?: string | null;
  phone?: string | null;
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
 *
 * Prefers a real audit built from Google Places public data (rating, review
 * volume, nearby competitors). Falls back to a clearly-labeled sample/demo
 * report when Places is unavailable (no key), the business can't be matched,
 * or any Places call fails. Always returns a usable record.
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
  const city = input.city?.trim() || null;

  // Attempt the real Places lookup first. Returns null on missing key / any
  // failure so we degrade gracefully to sample mode.
  const place = await findBusinessOnPlaces(businessName, city);

  const insertedLeads = await db
    .insert(auditLeads)
    .values({
      businessName,
      email,
      website: input.website?.trim() || null,
      gbpUrl: input.gbpUrl?.trim() || null,
      industry: input.industry?.trim() || null,
      city,
      phone: input.phone?.trim() || null,
      source: input.source ?? "website",
      placeId: place?.placeId ?? null,
      googleRating: place?.rating ?? null,
      googleReviewCount: place?.reviewCount ?? null,
    })
    .returning();
  const lead = insertedLeads[0];
  if (!lead) throw new Error("Failed to create audit lead");

  if (place) {
    const built = await buildRealAudit({ place, city });
    const insertedRequests = await db
      .insert(auditRequests)
      .values({
        auditLeadId: lead.id,
        status: "completed",
        score: built.report.score,
        reportJson: {
          report: built.report,
          inputs: {
            averageRating: place.rating,
            reviewCount: place.reviewCount,
          },
          place: {
            placeId: place.placeId,
            name: place.name,
            formattedAddress: place.formattedAddress,
            primaryType: place.primaryType,
          },
          rationale: built.rationale,
          version: "v2-places",
        } as Record<string, unknown>,
        demoMode: false,
      })
      .returning();
    const request = insertedRequests[0];
    if (!request) throw new Error("Failed to create audit request");
    return { lead, request, report: built.report, rationale: built.rationale };
  }

  // Sample/demo fallback (unchanged behavior).
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

/**
 * Build a real audit report from a matched place: fetch nearby competitors,
 * compute the comparison, and produce a public-data report. Competitor lookup
 * failures degrade to a report without comparison (findCompetitors returns []).
 */
async function buildRealAudit(args: {
  place: PlaceMatch;
  city: string | null;
}): Promise<{ report: ReputationReport; rationale: string }> {
  const competitors = await findCompetitors({
    business: args.place,
    city: args.city,
    limit: 3,
  });

  const comparison =
    competitors.length > 0
      ? buildCompetitorComparison(
          competitors.map(
            (c): CompetitorStat => ({
              name: c.name,
              rating: c.rating,
              reviewCount: c.reviewCount,
            }),
          ),
          args.place.rating,
        )
      : undefined;

  const report = computeRealReputationReport(
    { averageRating: args.place.rating, reviewCount: args.place.reviewCount ?? 0 },
    { comparison },
  );

  const rationale =
    "Based on your public Google Business Profile data" +
    (comparison ? " and nearby competitors" : "") +
    ". Connect your profile in AutoFiveStar to unlock reply gaps, review recency, and a weekly action plan.";

  return { report, rationale };
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
