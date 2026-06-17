import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  AuditRateLimitError,
  createAudit,
} from "@/lib/audit/leads";
import {
  buildResultsUrl,
  sendAuditLeadNotification,
  sendAuditReportEmail,
} from "@/lib/audit/email";
import { recordFunnelEvent } from "@/lib/analytics/funnel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function buildIpLimiter(): Ratelimit | null {
  try {
    return new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      prefix: "ratelimit:audit",
    });
  } catch {
    return null;
  }
}

function clientIp(): string {
  const h = headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type RequestPayload = {
  business_name?: string;
  email?: string;
  website?: string;
  gbp_url?: string;
  industry?: string;
  source?: string;
  session_id?: string;
};

async function readPayload(request: NextRequest): Promise<RequestPayload> {
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as
      | RequestPayload
      | null;
    return body ?? {};
  }
  const form = await request.formData();
  return {
    business_name: String(form.get("business_name") ?? ""),
    email: String(form.get("email") ?? ""),
    website: String(form.get("website") ?? ""),
    gbp_url: String(form.get("gbp_url") ?? ""),
    industry: String(form.get("industry") ?? ""),
    source: String(form.get("source") ?? ""),
    session_id: String(form.get("session_id") ?? ""),
  };
}

export async function POST(request: NextRequest) {
  const limiter = buildIpLimiter();
  if (limiter) {
    const { success } = await limiter.limit(clientIp());
    if (!success) {
      return NextResponse.json(
        { error: "Too many audit requests. Try again later." },
        { status: 429 },
      );
    }
  }

  const payload = await readPayload(request);
  const businessName = (payload.business_name ?? "").trim();
  const email = (payload.email ?? "").trim();
  const sessionId = payload.session_id || null;

  if (businessName.length === 0) {
    return NextResponse.json(
      { error: "Business name is required." },
      { status: 400 },
    );
  }
  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 },
    );
  }

  await recordFunnelEvent({
    type: "audit_started",
    sessionId,
    metadata: { business_name: businessName },
  });

  let result;
  try {
    result = await createAudit({
      businessName,
      email,
      website: payload.website || null,
      gbpUrl: payload.gbp_url || null,
      industry: payload.industry || null,
      source: payload.source || "website",
    });
  } catch (err) {
    if (err instanceof AuditRateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/audit] failed", err);
    return NextResponse.json(
      { error: "Could not generate the audit. Please try again." },
      { status: 500 },
    );
  }

  await recordFunnelEvent({
    type: "audit_completed",
    leadId: result.lead.id,
    requestId: result.request.id,
    sessionId,
    metadata: { score: result.report.score, grade: result.report.grade },
  });

  const resultsUrl = buildResultsUrl(result.request.id);

  // Email to the prospect (fire-and-forget but log outcome).
  const reportEmail = await sendAuditReportEmail({
    to: email,
    businessName,
    report: result.report,
    resultsUrl,
  });
  await recordFunnelEvent({
    type: reportEmail.ok ? "audit_email_sent" : "audit_email_failed",
    leadId: result.lead.id,
    requestId: result.request.id,
    sessionId,
    metadata: { fixture: reportEmail.fixture, error: reportEmail.error ?? null },
  });

  // Internal sales lead notification — ignore failure.
  await sendAuditLeadNotification({
    businessName,
    email,
    website: result.lead.website,
    gbpUrl: result.lead.gbpUrl,
    industry: result.lead.industry,
    score: result.report.score,
    resultsUrl,
  });

  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("application/json")) {
    return NextResponse.json({
      ok: true,
      request_id: result.request.id,
      results_url: `/free-audit/results/${result.request.id}`,
    });
  }
  return NextResponse.redirect(
    new URL(`/free-audit/results/${result.request.id}`, request.url),
    { status: 303 },
  );
}
