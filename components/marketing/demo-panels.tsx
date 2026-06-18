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
    <div className="grid gap-6 lg:grid-cols-2">
      <InboxPreview />
      <NegativeAlertPreview />
      <AiDraftPreview />
      <AnalyticsPreview />
    </div>
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
      meta="Tuned to your brand voice"
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
      meta="Sample trend"
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
