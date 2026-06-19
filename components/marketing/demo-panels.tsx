import { AnimatedStars } from "@/components/ui/animated-stars";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Visual proof for the marketing site. All copy + ratings here are static
 * sample data — never real customer reviews. The legend above the section
 * makes that clear.
 */
export function DemoPanels() {
  return (
    <div className="space-y-6">
      <GrowthScorePreview />
      <div className="grid gap-6 lg:grid-cols-2">
        <InboxPreview />
        <NegativeAlertPreview />
        <AiDraftPreview />
        <ReviewRequestPreview />
        <CompetitorPreview />
        <WeeklyReportPreview />
        <AnalyticsPreview />
      </div>
    </div>
  );
}

function SampleTag() {
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
      Sample data
    </span>
  );
}

function GrowthScorePreview() {
  return (
    <Card className="overflow-hidden border-border/70 shadow-card-lift">
      <CardContent className="grid gap-6 bg-gradient-to-br from-primary/5 via-card to-card p-6 sm:grid-cols-[auto,1fr] sm:items-center">
        <div className="flex items-center gap-5">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-brand-cyan text-white shadow-card-lift">
            <div className="text-center">
              <p className="text-3xl font-bold leading-none tabular-nums">87</p>
              <p className="text-[10px] uppercase tracking-wider opacity-90">/ 100</p>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Review growth score
              </p>
              <SampleTag />
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight">Grade B+</p>
            <p className="text-sm text-emerald-600">▲ up 6 points this month</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center sm:border-l sm:pl-6">
          {[
            { v: "4.7", l: "Avg rating" },
            { v: "+18", l: "New reviews / mo" },
            { v: "94%", l: "Response rate" },
          ].map((m) => (
            <div key={m.l}>
              <p className="text-xl font-semibold tabular-nums">{m.v}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {m.l}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewChrome({
  title,
  meta,
  children,
  accent,
}: {
  title: string;
  meta: string;
  children: React.ReactNode;
  accent?: "primary" | "amber" | "rose" | "emerald";
}) {
  const dot: Record<NonNullable<typeof accent>, string> = {
    primary: "bg-primary",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    emerald: "bg-emerald-500",
  };
  return (
    <Card className="hover-lift overflow-hidden border-border/70 shadow-card-lift">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-gradient-to-b from-secondary/40 to-secondary/20 py-3">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", dot[accent ?? "primary"])} />
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
            {title}
          </p>
        </div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {meta}
        </p>
      </CardHeader>
      <CardContent className="bg-card p-5">{children}</CardContent>
    </Card>
  );
}

function InboxPreview() {
  const rows = [
    {
      name: "Riley P.",
      rating: 5,
      excerpt:
        "Showed up on time and explained everything. Will absolutely call again.",
      status: "new",
      since: "3m ago",
    },
    {
      name: "Marisol K.",
      rating: 4,
      excerpt: "Great work overall. Driveway looked perfect.",
      status: "drafted",
      since: "1h ago",
    },
    {
      name: "Anonymous",
      rating: 2,
      excerpt: "Took longer than I expected. Tech was polite though.",
      status: "flagged",
      since: "2h ago",
    },
  ];
  return (
    <PreviewChrome title="Inbox" meta="Sample data" accent="primary">
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.name + r.since}
            className="flex items-start justify-between gap-3 rounded-md border bg-card p-3 text-sm"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <AnimatedStars rating={r.rating} animated={false} size="sm" />
                <span className="font-medium text-foreground">{r.name}</span>
                <StatusPill kind={r.status} />
              </div>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {r.excerpt}
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {r.since}
            </span>
          </li>
        ))}
      </ul>
    </PreviewChrome>
  );
}

function StatusPill({ kind }: { kind: string }) {
  const m: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    drafted: "bg-violet-100 text-violet-700",
    flagged: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
        m[kind] ?? "bg-secondary",
      )}
    >
      {kind}
    </span>
  );
}

function NegativeAlertPreview() {
  return (
    <PreviewChrome
      title="Negative review alert"
      meta="Sample push / SMS"
      accent="rose"
    >
      <div className="space-y-3 text-sm">
        <div className="rounded-md border bg-rose-50 p-3 text-rose-800">
          <p className="text-xs font-semibold uppercase tracking-wider">
            SMS · sent now
          </p>
          <p className="mt-1 leading-relaxed">
            AutoFiveStar: New 2-star review for Main Street Plumbing. Review
            and respond: <span className="underline">autofivestar.com/r/abc</span>
          </p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Email · subject
          </p>
          <p className="mt-1 font-medium">
            New 2-star review needs attention — Main Street Plumbing
          </p>
        </div>
      </div>
    </PreviewChrome>
  );
}

function AiDraftPreview() {
  const variants = [
    {
      tone: "Warm",
      body:
        "Hi Riley — thank you so much for sharing this. Knowing the tech took the time to walk you through things means the world. We can't wait to be your go-to.",
    },
    {
      tone: "Professional",
      body:
        "Thank you, Riley, for the kind feedback. We appreciate you noting our technician's communication. Please reach out anytime you need us.",
    },
    {
      tone: "Brief",
      body: "Thanks, Riley — glad we hit the mark. See you next time.",
    },
  ];
  return (
    <PreviewChrome
      title="AI response drafts"
      meta="Sample data"
      accent="primary"
    >
      <div className="space-y-2">
        {variants.map((v) => (
          <div
            key={v.tone}
            className="rounded-md border bg-card p-3 text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {v.tone}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ~{v.body.split(" ").length} words
              </span>
            </div>
            <p className="mt-1 leading-relaxed text-foreground">{v.body}</p>
          </div>
        ))}
      </div>
    </PreviewChrome>
  );
}

function ReviewRequestPreview() {
  return (
    <PreviewChrome
      title="Review request campaign"
      meta="Sample data"
      accent="primary"
    >
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-medium text-foreground">Spring happy-customers list</p>
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-emerald-700">
            Sending
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { v: "128", l: "Sent" },
            { v: "54", l: "Opened" },
            { v: "12", l: "New reviews" },
          ].map((m) => (
            <div key={m.l} className="rounded-md border bg-card p-2">
              <p className="text-lg font-semibold tabular-nums">{m.v}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {m.l}
              </p>
            </div>
          ))}
        </div>
        <div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Email · SMS · QR</span>
            <span>42% open rate</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-primary to-brand-cyan" />
          </div>
        </div>
      </div>
    </PreviewChrome>
  );
}

function CompetitorPreview() {
  const rows = [
    { name: "You — Main Street Plumbing", rating: 4.7, count: 213, you: true },
    { name: "Across Town Plumbing", rating: 4.4, count: 318, you: false },
    { name: "Citywide Rooter", rating: 4.1, count: 156, you: false },
  ];
  return (
    <PreviewChrome
      title="Competitor snapshot"
      meta="Sample data"
      accent="amber"
    >
      <div className="space-y-2 text-sm">
        {rows.map((r) => (
          <div
            key={r.name}
            className={cn(
              "rounded-md border p-3",
              r.you ? "border-primary/40 bg-primary/5" : "bg-card",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "min-w-0 truncate font-medium",
                  r.you ? "text-primary" : "text-foreground",
                )}
              >
                {r.name}
              </span>
              <span className="shrink-0 tabular-nums">★ {r.rating}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {r.count} reviews
            </p>
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground">
          You lead on rating but trail on volume — close the gap with review
          requests.
        </p>
      </div>
    </PreviewChrome>
  );
}

function WeeklyReportPreview() {
  return (
    <PreviewChrome title="Weekly report" meta="Sample data" accent="emerald">
      <div className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">
          Emailed every Monday — Main Street Plumbing
        </p>
        <ul className="space-y-1.5">
          {[
            { label: "New reviews", value: "+9", good: true },
            { label: "Avg rating this week", value: "4.8 ★", good: true },
            { label: "Replies posted", value: "9 / 9", good: true },
            { label: "Needs attention", value: "1 review", good: false },
          ].map((r) => (
            <li
              key={r.label}
              className="flex items-center justify-between rounded-md border bg-card px-3 py-2"
            >
              <span className="text-muted-foreground">{r.label}</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  r.good ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {r.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </PreviewChrome>
  );
}

function AnalyticsPreview() {
  const bars = [
    { label: "5★", count: 78 },
    { label: "4★", count: 22 },
    { label: "3★", count: 8 },
    { label: "2★", count: 3 },
    { label: "1★", count: 2 },
  ];
  const max = Math.max(...bars.map((b) => b.count));
  return (
    <PreviewChrome
      title="Reputation analytics"
      meta="Sample data"
      accent="emerald"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-semibold tabular-nums">4.7</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Avg rating
            </p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">94%</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Response rate
            </p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums text-emerald-600">
              +18
            </p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Reviews this wk
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          {bars.map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-xs">
              <span className="w-6 text-muted-foreground">{b.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-brand-cyan"
                  style={{ width: `${(b.count / max) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right tabular-nums text-muted-foreground">
                {b.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PreviewChrome>
  );
}
