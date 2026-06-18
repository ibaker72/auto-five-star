import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  locations,
  organizations,
  usageCounters,
} from "@/lib/db/schema";
import { PLAN_CONFIG, type Plan } from "./plans";

export type Entitlement =
  | "ai.generate"
  | "yelp.read"
  | "alerts.sms"
  | "actions.bulk"
  | "locations.connect"
  | "review_requests.sms"
  | "review_requests.csv";

export type PlanLimits = {
  plan: Plan;
  maxLocations: number;
  monthlyAiResponses: number | null;
  yelp: boolean;
  smsAlerts: boolean;
  bulkActions: boolean;
};

export function getPlanLimits(plan: Plan): PlanLimits {
  const cfg = PLAN_CONFIG[plan];
  return {
    plan,
    maxLocations: cfg.maxLocations,
    monthlyAiResponses: cfg.monthlyAiResponses,
    yelp: cfg.yelp,
    smsAlerts: cfg.smsAlerts,
    bulkActions: cfg.bulkActions,
  };
}

async function getOrgPlan(orgId: string): Promise<Plan> {
  const rows = await db
    .select({ plan: organizations.plan })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new EntitlementError("Organization not found");
  return row.plan as Plan;
}

export type EntitlementCheck = {
  ok: boolean;
  reason?: string;
  used?: number;
  limit?: number | null;
};

export async function canConnectLocation(
  orgId: string,
): Promise<EntitlementCheck> {
  const plan = await getOrgPlan(orgId);
  const limits = getPlanLimits(plan);
  const rows = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.orgId, orgId));
  const used = rows.length;
  if (used >= limits.maxLocations) {
    return {
      ok: false,
      reason: `Your ${plan} plan allows up to ${limits.maxLocations} location${limits.maxLocations === 1 ? "" : "s"}. Upgrade to add more.`,
      used,
      limit: limits.maxLocations,
    };
  }
  return { ok: true, used, limit: limits.maxLocations };
}

function currentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export async function getAiResponsesUsedThisMonth(
  orgId: string,
): Promise<number> {
  const { start } = currentMonthRange();
  const rows = await db
    .select({ used: usageCounters.aiResponsesUsed })
    .from(usageCounters)
    .where(
      and(
        eq(usageCounters.orgId, orgId),
        gte(usageCounters.periodStart, start),
      ),
    )
    .limit(1);
  return rows[0]?.used ?? 0;
}

export async function canGenerateAiResponse(
  orgId: string,
): Promise<EntitlementCheck> {
  const plan = await getOrgPlan(orgId);
  const limits = getPlanLimits(plan);
  if (limits.monthlyAiResponses === null) {
    return { ok: true, limit: null };
  }
  const used = await getAiResponsesUsedThisMonth(orgId);
  if (used >= limits.monthlyAiResponses) {
    return {
      ok: false,
      reason: `Monthly AI response quota reached (${used}/${limits.monthlyAiResponses}). Upgrade to Growth for unlimited.`,
      used,
      limit: limits.monthlyAiResponses,
    };
  }
  return { ok: true, used, limit: limits.monthlyAiResponses };
}

export async function canUseYelp(orgId: string): Promise<EntitlementCheck> {
  const plan = await getOrgPlan(orgId);
  return getPlanLimits(plan).yelp
    ? { ok: true }
    : {
        ok: false,
        reason: "Yelp integration requires Growth or Pro.",
      };
}

export async function canUseSmsAlerts(
  orgId: string,
): Promise<EntitlementCheck> {
  const plan = await getOrgPlan(orgId);
  return getPlanLimits(plan).smsAlerts
    ? { ok: true }
    : { ok: false, reason: "SMS alerts require Growth or Pro." };
}

export async function canUseBulkActions(
  orgId: string,
): Promise<EntitlementCheck> {
  const plan = await getOrgPlan(orgId);
  return getPlanLimits(plan).bulkActions
    ? { ok: true }
    : { ok: false, reason: "Bulk actions require Pro." };
}

export async function canSendSmsReviewRequests(
  orgId: string,
): Promise<EntitlementCheck> {
  const plan = await getOrgPlan(orgId);
  return plan === "growth" || plan === "pro"
    ? { ok: true }
    : {
        ok: false,
        reason: "SMS review requests require Growth or Pro.",
      };
}

export async function canImportCsvReviewRequests(
  orgId: string,
): Promise<EntitlementCheck> {
  const plan = await getOrgPlan(orgId);
  return plan === "growth" || plan === "pro"
    ? { ok: true }
    : {
        ok: false,
        reason: "CSV import is available on Growth and Pro.",
      };
}

export class EntitlementError extends Error {
  constructor(
    message: string,
    public readonly entitlement?: Entitlement,
    public readonly check?: EntitlementCheck,
  ) {
    super(message);
    this.name = "EntitlementError";
  }
}

const CHECKERS: Record<
  Entitlement,
  (orgId: string) => Promise<EntitlementCheck>
> = {
  "ai.generate": canGenerateAiResponse,
  "yelp.read": canUseYelp,
  "alerts.sms": canUseSmsAlerts,
  "actions.bulk": canUseBulkActions,
  "locations.connect": canConnectLocation,
  "review_requests.sms": canSendSmsReviewRequests,
  "review_requests.csv": canImportCsvReviewRequests,
};

export async function requireEntitlement(
  orgId: string,
  entitlement: Entitlement,
): Promise<EntitlementCheck> {
  const check = await CHECKERS[entitlement](orgId);
  if (!check.ok) {
    throw new EntitlementError(
      check.reason ?? "Not entitled to this feature.",
      entitlement,
      check,
    );
  }
  return check;
}

/**
 * Atomically increment the current month's AI usage counter. Returns the new
 * total. Creates the period row if missing.
 */
export async function incrementAiUsage(
  orgId: string,
  count: number,
  costCents: number,
): Promise<void> {
  const { start, end } = currentMonthRange();

  // Upsert: insert if missing, otherwise increment.
  await db
    .insert(usageCounters)
    .values({
      orgId,
      periodStart: start,
      periodEnd: end,
      aiResponsesUsed: count,
      aiCostCents: costCents,
      reviewsPulled: 0,
    })
    .onConflictDoUpdate({
      target: [usageCounters.orgId, usageCounters.periodStart],
      set: {
        aiResponsesUsed: sql`${usageCounters.aiResponsesUsed} + ${count}`,
        aiCostCents: sql`${usageCounters.aiCostCents} + ${costCents}`,
        updatedAt: new Date(),
      },
    });
}
