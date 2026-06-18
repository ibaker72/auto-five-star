import { AnimatedStars } from "@/components/ui/animated-stars";
import { cn } from "@/lib/utils";

/**
 * Marketing feature showcase: alternating copy + branded UI mockups.
 *
 * Every mockup is built from styled markup that mirrors the real dashboard
 * design language — no screenshots, no fabricated customer claims. All numbers
 * and review text are clearly labelled sample content.
 */

function SampleBadge() {
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      Sample
    </span>
  );
}

function BrowserFrame({
  url,
  children,
}: {
  url: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card-lift">
      <div className="flex items-center gap-2 border-b bg-gradient-to-b from-secondary/50 to-secondary/20 px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        </span>
        <span className="ml-2 flex-1 truncate rounded-md bg-background/70 px-3 py-1 text-center text-[11px] text-muted-foreground">
          {url}
        </span>
      </div>
      <div className="bg-card p-4 sm:p-6">{children}</div>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[300px] rounded-[2rem] border-4 border-foreground/10 bg-card p-3 shadow-card-lift">
      <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-foreground/10" />
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({
  eyebrow,
  title,
  body,
  bullets,
  media,
  reverse,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  media: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
      <div className={cn(reverse && "md:order-2")}>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h3>
        <p className="mt-3 text-muted-foreground">{body}</p>
        <ul className="mt-5 space-y-2">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                ✓
              </span>
              <span className="text-foreground">{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={cn(reverse && "md:order-1")}>{media}</div>
    </div>
  );
}

function AlertMock() {
  return (
    <PhoneFrame>
      <div className="rounded-xl border bg-rose-50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">
            Push · now
          </span>
          <SampleBadge />
        </div>
        <p className="mt-1.5 text-sm font-medium text-rose-900">
          New 2★ review — Main Street Plumbing
        </p>
        <p className="mt-1 text-xs text-rose-800/80">
          Tap to review and respond before it spreads.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          SMS · now
        </span>
        <p className="mt-1.5 text-sm text-foreground">
          AutoFiveStar: 2★ review needs a reply. Open
          <span className="text-primary"> autofivestar.com/r/abc</span>
        </p>
      </div>
      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-center gap-2">
          <AnimatedStars rating={5} animated={false} size="sm" />
          <span className="text-[10px] uppercase tracking-wider text-emerald-600">
            Daily digest
          </span>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          6 new 5★ reviews batched — nothing urgent.
        </p>
      </div>
    </PhoneFrame>
  );
}

function DraftMock() {
  const drafts = [
    { tone: "Warm", text: "Thank you so much, Riley! We loved having you and can't wait to help again." },
    { tone: "Professional", text: "We appreciate your feedback, Riley. Please reach out anytime you need us." },
    { tone: "Brief", text: "Thanks, Riley — glad we hit the mark!" },
  ];
  return (
    <BrowserFrame url="app.autofivestar.com/inbox">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AnimatedStars rating={5} animated={false} size="sm" />
          <span className="text-sm font-medium">Riley P.</span>
        </div>
        <SampleBadge />
      </div>
      <div className="space-y-2">
        {drafts.map((d, i) => (
          <div
            key={d.tone}
            className={cn(
              "rounded-lg border p-3",
              i === 0 ? "border-primary/40 bg-primary/5" : "bg-card",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                {d.tone}
              </span>
              {i === 0 ? (
                <span className="text-[10px] font-medium text-primary">
                  Selected
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-foreground">
              {d.text}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <span className="flex-1 rounded-md bg-gradient-to-r from-primary to-brand-cyan px-3 py-2 text-center text-xs font-medium text-white">
          Approve &amp; post to Google
        </span>
        <span className="rounded-md border px-3 py-2 text-center text-xs text-muted-foreground">
          Regenerate
        </span>
      </div>
    </BrowserFrame>
  );
}

function RequestMock() {
  return (
    <BrowserFrame url="app.autofivestar.com/review-requests">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">New campaign</span>
        <SampleBadge />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {["Email", "SMS", "QR code"].map((c, i) => (
          <div
            key={c}
            className={cn(
              "rounded-lg border p-3 text-center text-xs font-medium",
              i === 0 ? "border-primary/40 bg-primary/5 text-primary" : "text-muted-foreground",
            )}
          >
            {c}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border bg-secondary/30 p-3">
        <p className="text-xs text-muted-foreground">Sending to</p>
        <p className="text-sm font-medium">128 recent customers · CSV import</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-primary to-brand-cyan" />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          96 sent · 41 opened · 12 new reviews
        </p>
      </div>
    </BrowserFrame>
  );
}

function AnalyticsMock() {
  const bars = [88, 64, 72, 95, 80, 90];
  return (
    <BrowserFrame url="app.autofivestar.com/dashboard">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">This month</span>
        <SampleBadge />
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { v: "4.8", l: "Avg rating" },
          { v: "96%", l: "Response rate" },
          { v: "+23", l: "New reviews" },
        ].map((m) => (
          <div key={m.l} className="rounded-lg border bg-card p-2">
            <p className="text-xl font-semibold tabular-nums">{m.v}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {m.l}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex h-24 items-end gap-2">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md bg-gradient-to-t from-primary to-brand-cyan"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Weekly review volume — trending up
      </p>
    </BrowserFrame>
  );
}

export function FeatureShowcase() {
  return (
    <section className="container mx-auto space-y-16 px-6 py-20 sm:space-y-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          A closer look
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          The whole review workflow, in one app
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Every screen below is a branded preview of the AutoFiveStar interface.
          Ratings and copy are sample content — never real customer reviews.
        </p>
      </div>

      <Row
        eyebrow="Review alerts"
        title="Know the moment a review lands"
        body="Negative reviews trigger instant push, SMS, and email alerts so you can respond before the next customer scrolls past. Positives are batched into a calm daily digest."
        bullets={[
          "Instant alerts for 1–2★ reviews",
          "SMS escalation on Growth and Pro",
          "Daily digest for the good news",
        ]}
        media={<AlertMock />}
      />

      <Row
        reverse
        eyebrow="AI response drafting"
        title="Three on-brand replies, ready to post"
        body="AutoFiveStar drafts warm, professional, and brief variants tuned to your brand voice. Pick one, tweak if you like, and post straight to Google in a click."
        bullets={[
          "Tuned to your brand voice and industry",
          "Edit before posting — you stay in control",
          "One-click publish to Google Business Profile",
        ]}
        media={<DraftMock />}
      />

      <Row
        eyebrow="Review request automation"
        title="Turn happy customers into 5★ reviews"
        body="Send single requests, bulk CSV campaigns, or print a QR code for the counter. Built-in industry templates do the writing, and you watch the responses roll in."
        bullets={[
          "Email, SMS, and printable QR codes",
          "Bulk CSV campaigns with open tracking",
          "Industry-specific request templates",
        ]}
        media={<RequestMock />}
      />

      <Row
        reverse
        eyebrow="Dashboard analytics"
        title="See your reputation improve"
        body="Track average rating, response rate, and review velocity at a glance. Spot trends early and prove the work is paying off — all in one clean dashboard."
        bullets={[
          "Rating, response rate, and weekly trend",
          "Ratings distribution at a glance",
          "Exportable reports for your records",
        ]}
        media={<AnalyticsMock />}
      />
    </section>
  );
}
