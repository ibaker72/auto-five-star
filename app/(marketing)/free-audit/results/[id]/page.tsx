import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { extractReport, getAuditByRequestId } from "@/lib/audit/leads";
import { cn } from "@/lib/utils";
import { TrackedCtas } from "./tracked-ctas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your reputation audit",
  description:
    "Your reputation score, strengths, opportunities, and recommendations.",
  robots: { index: false, follow: false }, // results are per-lead, don't index
};

export default async function AuditResultsPage({
  params,
}: {
  params: { id: string };
}) {
  if (!/^[0-9a-fA-F-]{36}$/.test(params.id)) notFound();

  const found = await getAuditByRequestId(params.id);
  if (!found) notFound();

  const { lead, request } = found;
  const { report, rationale } = extractReport(request);
  if (!report) notFound();

  return (
    <section className="container mx-auto px-6 pt-16 pb-16 md:pt-20">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Reputation audit
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          {lead.businessName}
        </h1>

        {request.demoMode ? (
          <Alert className="mt-6">
            <AlertTitle>Demo data — we couldn't read your reviews yet</AlertTitle>
            <AlertDescription>
              {rationale ??
                "This first report uses a representative sample. Sign up to connect your Google Business Profile and see live numbers."}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardDescription>Reputation score</CardDescription>
              <CardTitle className="flex items-baseline gap-3">
                <span className="text-5xl font-semibold tabular-nums">
                  {report.score}
                </span>
                <span className="text-base font-normal text-muted-foreground">
                  / 100
                </span>
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-xs uppercase tracking-wider",
                    report.score >= 80
                      ? "bg-emerald-100 text-emerald-700"
                      : report.score >= 65
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700",
                  )}
                >
                  Grade {report.grade}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Higher is better. We score four dimensions out of 100 total:
                rating quality (40), volume (20), recency (20), and response
                rate (20).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Breakdown</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Row label="Rating" value={report.breakdown.rating} max={40} />
              <Row label="Volume" value={report.breakdown.volume} max={20} />
              <Row label="Recency" value={report.breakdown.recency} max={20} />
              <Row
                label="Response rate"
                value={report.breakdown.response}
                max={20}
              />
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              {report.strengths.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing stood out as a clear strength yet.
                </p>
              ) : (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {report.strengths.map((s) => (
                    <li key={s}>· {s}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {report.opportunities.map((o) => (
                  <li key={o}>· {o}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">What to do next</CardTitle>
            <CardDescription>
              A short, opinionated punch list. AutoFiveStar handles most of
              these for you on the trial.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-muted-foreground">
              {report.recommendations.map((r, i) => (
                <li key={r}>
                  <span className="font-medium text-foreground">
                    {i + 1}.
                  </span>{" "}
                  {r}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <section className="mt-10 rounded-md border bg-primary/5 p-6 text-center">
          <h2 className="text-xl font-bold tracking-tight">
            Want to fix this on autopilot?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            AutoFiveStar drafts on-brand replies for every review and flags
            urgent ones the moment they land. 14-day free trial.
          </p>
          <div className="mt-4">
            <TrackedCtas requestId={request.id} leadId={lead.id} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            We also emailed this report to {lead.email}.{" "}
            <Link href="/free-audit" className="underline">
              Run another audit
            </Link>
            .
          </p>
        </section>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {value} / {max}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full",
            value / max >= 0.7
              ? "bg-emerald-500"
              : value / max >= 0.4
                ? "bg-amber-500"
                : "bg-rose-500",
          )}
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
