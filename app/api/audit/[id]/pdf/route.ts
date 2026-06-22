import { NextResponse, type NextRequest } from "next/server";
import { getAuditByRequestId, extractReport } from "@/lib/audit/leads";
import { generateAuditPdf } from "@/lib/audit/pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "Invalid audit ID." },
      { status: 400 },
    );
  }

  let found: Awaited<ReturnType<typeof getAuditByRequestId>> = null;
  try {
    found = await getAuditByRequestId(id);
  } catch (err) {
    console.error(`[api/audit/pdf] lookup failed for id=${id}`, err);
    return NextResponse.json(
      { error: "Could not load audit." },
      { status: 500 },
    );
  }

  if (!found) {
    return NextResponse.json(
      { error: "Audit not found." },
      { status: 404 },
    );
  }

  const { lead, request } = found;

  let report: ReturnType<typeof extractReport>["report"];
  try {
    ({ report } = extractReport(request));
  } catch (err) {
    console.error(`[api/audit/pdf] malformed reportJson for id=${id}`, err);
    return NextResponse.json(
      { error: "Audit report data is malformed." },
      { status: 500 },
    );
  }

  if (!report) {
    return NextResponse.json(
      { error: "Audit report data is missing." },
      { status: 404 },
    );
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateAuditPdf({
      lead,
      report,
      demoMode: request.demoMode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(
      `[api/audit/pdf] generation failed for id=${id}: ${message}`,
      { stack, businessName: lead.businessName, demoMode: request.demoMode },
    );
    return NextResponse.json(
      { error: "Could not generate PDF." },
      { status: 500 },
    );
  }

  const safeName = lead.businessName
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  const filename = `reputation-audit-${safeName}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
