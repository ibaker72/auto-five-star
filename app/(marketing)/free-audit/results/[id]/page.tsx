import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BellRing, MessageSquareText, Star } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { extractReport, getAuditByRequestId } from "@/lib/audit/leads";
import { cn } from "@/lib/utils";
import { TrackedCtas } from "./tracked-ctas";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = {
  title: "Your reputation audit",
  description:
    "Your reputation score, strengths, opportunities, and recommendations.",
  robots: { index: false, follow: false }, // results are per-lead, don't index
};

// Plain-English read on what a score means — used under the score card.
function scoreBand(score: number): { label: string; blurb: string } {
  if (score >= 90) {
    return {
      label: "Excellent",
      blurb:
        "Your reputation is a real competitive advantage. The work now is protecting it — keep reviews fresh and replies fast.",
    };
  }
  if (score >= 75) {
    return {
      label: "Strong — but leaving trust on the table",
      blurb:
        "You're in good shape, but missed reviews and unanswered replies are leaving trust (and leads) on the table.",
    };
  }
  if (score >= 60) {
    return {
      label: "Needs attention",
      blurb:
        "Gaps in review volume, recency, or replies are likely making prospects hesitate before they call.",
    };
  }
  return {
    label: "Likely costing you leads",
    blurb:
      "Customers comparing you to a competitor may be choosing them. This is fixable — usually faster than owners expect.",
  };
}

// Why the numbers matter, in customer terms. No revenue claims.
const REVENUE_IMPACT: { title: string; body: string }[] = [
  {
    title: "Recent 5-star reviews build trust",
    body: "Fresh positive reviews reassure people who are comparing you right now.",
  },
  {
    title: "Unanswered reviews cost conversions",
    body: "Silent profiles look inactive — a visible reply can win back a wavering shopper.",
  },
  {
    title: "Fast replies signal an active business",
    body: "Responding quickly tells prospects you'll take care of them too.",
  },
  {
    title: "Volume helps you win the comparison",
    body: "When customers weigh you against a competitor, more reviews tip the choice.",
  },
];

// Curated best-practice punch list. A single, deterministic set of actions so
// the section never repeats itself (e.g. two "ask for reviews" items).
const ACTION_ITEMS: string[] = [
  "Reply to every unanswered review — replies are public and win back wavering shoppers.",
  "Ask recent happy customers for a review the day of service, while it's fresh.",
  "Flag urgent or negative reviews fast so you can respond before they spread.",
  "Keep reviews coming in every month so your profile always looks active.",
  "Track your weekly review momentum so you know whether trust is improving or slipping.",
  "Use AI drafts to move fast, but approve every reply before it posts.",
];

const WHAT_WE_DO: { icon: typeof Star; title: string; body: string }[] = [
  {
    icon: MessageSquareText,
    title: "Drafts replies in your brand voice",
    body: "On-brand responses to every review in seconds — you approve before anything posts.",
  },
  {
    icon: BellRing,
    title: "Flags reviews that need urgent attention",
    body: "Negative or time-sensitive reviews get surfaced so nothing slips through.",
  },
  {
    icon: Star,
    title: "Helps you request more 5-star reviews",
    body: "A steady, automated cadence that asks happy customers at the right moment.",
  },
];

/**
 * Shown when the URL is a valid audit-result path but we can't load the row
 * (e.g. an expired/incorrect id). We deliberately render a friendly page
 * instead of calling notFound() so the prospect gets a clear next step rather
 * than a bare 404.
 */
function AuditNotFound() {
  return (
    <section className="container mx-auto px-6 pt-16 pb-16 md:pt-20">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          We couldn&apos;t find this audit result
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This audit link may have expired or the address might be incorrect.
          Run a fresh audit and we&apos;ll generate a new report in about two
          minutes.
        </p>
        <div className="mt-6">
          <Button asChild size="lg" variant="brand">
            <Link href="/free-audit">Run a new audit</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export default async function AuditResultsPage({
  params,
}: {
  // Next.js 16: dynamic route params are async and must be awaited.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // A malformed id is a genuinely invalid route -> 404.
  if (!UUID_RE.test(id)) {
    console.warn(`[free-audit/results] invalid result id: ${JSON.stringify(id)}`);
    notFound();
  }

  let found: Awaited<ReturnType<typeof getAuditByRequestId>> = null;
  try {
    found = await getAuditByRequestId(id);
  } catch (err) {
    // A DB error is not the same as a missing row — log it and fall back to
    // the friendly page rather than crashing with a 500.
    console.error(`[free-audit/results] lookup failed for id=${id}`, err);
    return <AuditNotFound />;
  }

  if (!found) {
    console.warn(`[free-audit/results] no audit_requests row for id=${id}`);
    return <AuditNotFound />;
  }

  const { lead, request } = found;
  const { report } = extractReport(request);
  if (!report) {
    console.warn(
      `[free-audit/results] audit_requests row ${id} has no report payload`,
    );
    return <AuditNotFound />;
  }

  const band = scoreBand(report.score);

  return (
    <section className="container mx-auto px-6 pt-16 pb-16 md:pt-20">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Reputation audit
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {lead.businessName}
          </h1>
          {request.demoMode ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              Preview Audit
            </span>
          ) : null}
        </div>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Your review profile is costing or winning trust before customers ever
          call. Here&apos;s where {lead.businessName} stands today.
        </p>

        {request.demoMode ? (
          <Alert className="mt-6">
            <AlertTitle>Connect to unlock your live review data</AlertTitle>
            <AlertDescription>
              This preview uses available reputation signals and sample
              benchmarks. Connect your Google Business Profile to unlock your
              live review data, reply gaps, urgent reviews, and weekly action
              plan.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardDescription>Reputation score</CardDescription>
              <CardTitle className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
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
              <div className="mt-4 rounded-md bg-secondary/60 p-3">
                <p className="text-sm font-semibold text-foreground">
                  {report.score}/100 · {band.label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {band.blurb}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Breakdown</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {report.breakdownItems && report.breakdownItems.length > 0 ? (
                report.breakdownItems.map((item) => (
                  <Row
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    max={item.max}
                  />
                ))
              ) : (
                <>
                  <Row label="Rating" value={report.breakdown.rating} max={40} />
                  <Row label="Volume" value={report.breakdown.volume} max={20} />
                  <Row
                    label="Recency"
                    value={report.breakdown.recency}
                    max={20}
                  />
                  <Row
                    label="Response rate"
                    value={report.breakdown.response}
                    max={20}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {!request.demoMode &&
        (lead.googleRating !== null || lead.googleReviewCount !== null) ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Your Google rating</CardDescription>
                <CardTitle className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular-nums">
                    {lead.googleRating !== null
                      ? lead.googleRating.toFixed(1)
                      : "—"}
                  </span>
                  <span className="text-amber-500">
                    {"★".repeat(Math.round(lead.googleRating ?? 0))}
                    {"☆".repeat(5 - Math.round(lead.googleRating ?? 0))}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Pulled live from your public Google Business Profile.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Google reviews</CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-nums">
                  {lead.googleReviewCount !== null
                    ? lead.googleReviewCount.toLocaleString()
                    : "—"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                The more recent reviews you have, the more you win the
                comparison.
              </CardContent>
            </Card>
          </div>
        ) : null}

        {report.competitors && report.competitors.competitors.length > 0 ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">How you compare</CardTitle>
              <CardDescription>
                {lead.businessName} vs. nearby competitors we found on Google.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Business</th>
                      <th className="pb-2 pr-4 font-medium">Rating</th>
                      <th className="pb-2 font-medium">Reviews</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="font-medium text-primary">
                      <td className="py-2 pr-4">{lead.businessName} (you)</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {lead.googleRating !== null
                          ? lead.googleRating.toFixed(1)
                          : "—"}
                      </td>
                      <td className="py-2 tabular-nums">
                        {lead.googleReviewCount !== null
                          ? lead.googleReviewCount.toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                    {report.competitors.competitors.map((c, i) => (
                      <tr key={`${c.name}-${i}`}>
                        <td className="py-2 pr-4">{c.name}</td>
                        <td className="py-2 pr-4 tabular-nums">
                          {c.rating !== null ? c.rating.toFixed(1) : "—"}
                        </td>
                        <td className="py-2 tabular-nums">
                          {c.reviewCount !== null
                            ? c.reviewCount.toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {report.competitors.ratingGap !== null ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  {report.competitors.ratingGap >= 0
                    ? `You're ahead of the local average by ${report.competitors.ratingGap.toFixed(1)} stars. Keep it up by staying responsive and asking for fresh reviews.`
                    : `You're ${Math.abs(report.competitors.ratingGap).toFixed(1)} stars behind the local average — closing that gap is exactly what AutoFiveStar is built for.`}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {report.recommendations.length > 0 ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Your top 3 fixes</CardTitle>
              <CardDescription>
                The highest-leverage moves for {lead.businessName} right now.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm text-muted-foreground">
                {report.recommendations.slice(0, 3).map((r, i) => (
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
        ) : null}

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
            <CardTitle className="text-lg">
              What your reputation is worth
            </CardTitle>
            <CardDescription>
              Why these numbers matter for the customers deciding right now.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {REVENUE_IMPACT.map((item) => (
                <div key={item.title}>
                  <p className="text-sm font-semibold text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm font-medium text-foreground">
              Even a small lift in trust can turn more searches into calls.
            </p>
          </CardContent>
        </Card>

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
              {ACTION_ITEMS.map((r, i) => (
                <li key={r}>
                  <span className="font-medium text-foreground">{i + 1}.</span>{" "}
                  {r}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <section className="mt-10">
          <h2 className="text-xl font-bold tracking-tight">
            What AutoFiveStar does for you
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            We turn this snapshot into an ongoing system — set up with you.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHAT_WE_DO.map((item) => (
              <Card key={item.title} className="h-full">
                <CardHeader className="pb-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <CardTitle className="mt-3 text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {item.body}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-md border bg-primary/5 p-6 text-center sm:p-8">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Ready to turn this into real review growth?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            {request.demoMode
              ? "Connect your Google Business Profile and we'll replace this sample with your real review health, reply gaps, urgent reviews, and a weekly action plan."
              : "Start your plan and we'll handle replies, surface urgent reviews, and help you request more 5-star reviews — set up with you."}
          </p>
          <div className="mt-5">
            <TrackedCtas requestId={request.id} leadId={lead.id} />
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">
            We also emailed this report to {lead.email}.{" "}
            <Link href="/free-audit" className="underline underline-offset-2">
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
