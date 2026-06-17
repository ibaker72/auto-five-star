import { NextResponse, type NextRequest } from "next/server";
import {
  isFunnelEventType,
  recordFunnelEvent,
} from "@/lib/analytics/funnel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        type?: string;
        lead_id?: string | null;
        request_id?: string | null;
        session_id?: string | null;
        metadata?: Record<string, unknown>;
      }
    | null;

  if (!body || !isFunnelEventType(body.type)) {
    return NextResponse.json(
      { error: "Invalid event type" },
      { status: 400 },
    );
  }

  await recordFunnelEvent({
    type: body.type,
    leadId: body.lead_id ?? null,
    requestId: body.request_id ?? null,
    sessionId: body.session_id ?? null,
    metadata: body.metadata ?? {},
  });

  return NextResponse.json({ ok: true });
}
