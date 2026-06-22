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
import { inngest } from "@/lib/inngest/client";

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

async function clientIp(): Promise<string> {
  const h = await headers();
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
  city?: string;
  phone?: string;
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
    city: String(form.get("city") ?? ""),
    phone: String(form.get("phone") ?? ""),
    source: String(form.get("source") ?? ""),
    session_id: String(form.get("session_id") ?? ""),
  };
}

export async function POST(request: NextRequest) {
  const limiter = buildIpLimiter();
  if (limiter) {
    const { success } = await limiter.limit(await clientIp());
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
  const city = (payload.city ?? "").trim() || null;
  const phone = (payload.phone ?? "").trim() || null;
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
    metadata: { business_name: businessName, city, has_phone: Boolean(phone) },
  });

  let result;
  try {
    result = await createAudit({
      businessName,
      email,
      website: payload.website || null,
      gbpUrl: payload.gbp_url || null,
      industry: payload.industry || null,
      city,
      phone,
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

  // Email to the prospect. The lead is already saved and the results page
  // works regardless — never let an email failure (e.g. EMAIL_LIVE off or a
  // Resend hiccup) turn a captured lead into a 500 for the prospect.
  try {
    const reportEmail = await sendAuditReportEmail({
      to: email,
      businessName,
      requestId: result.request.id,
      report: result.report,
      googleRating: result.lead.googleRating,
      googleReviewCount: result.lead.googleReviewCount,
    });
    await recordFunnelEvent({
      type: reportEmail.ok ? "audit_email_sent" : "audit_email_failed",
      leadId: result.lead.id,
      requestId: result.request.id,
      sessionId,
      metadata: {
        fixture: reportEmail.fixture,
        error: reportEmail.error ?? null,
      },
    });
  } catch (err) {
    console.error("[api/audit] report email failed", err);
    await recordFunnelEvent({
      type: "audit_email_failed",
      leadId: result.lead.id,
      requestId: result.request.id,
      sessionId,
      metadata: {
        fixture: false,
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }

  // Internal sales lead notification — best-effort, never blocks the response.
  try {
    await sendAuditLeadNotification({
      businessName,
      email,
      website: result.lead.website,
      gbpUrl: result.lead.gbpUrl,
      industry: result.lead.industry,
      city: result.lead.city,
      phone: result.lead.phone,
      score: result.report.score,
      resultsUrl,
    });
  } catch (err) {
    console.error("[api/audit] lead notification failed", err);
  }

  // Kick off the multi-day follow-up drip. Best-effort and fire-and-forget:
  // if Inngest isn't configured (or the dispatch fails) the captured lead and
  // immediate email are unaffected. Idempotent on lead id inside the function.
  try {
    await inngest.send({
      name: "audit/lead.created",
      data: {
        leadId: result.lead.id,
        requestId: result.request.id,
      },
    });
  } catch (err) {
    console.error("[api/audit] follow-up enqueue failed", err);
  }

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
