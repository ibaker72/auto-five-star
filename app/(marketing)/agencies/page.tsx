import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandGlow } from "@/components/ui/brand-glow";
import { centsToUsd } from "@/lib/utils";
import { PLAN_CONFIG } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "AutoFiveStar for agencies",
  description:
    "Sell review management as your own. White-label dashboard, multi-client billing, bulk operations, and API access on the Pro plan.",
  alternates: { canonical: "https://autofivestar.com/agencies" },
  openGraph: {
    title: "AutoFiveStar for agencies",
    description:
      "Resell review management as your own brand. Built for marketing agencies and local SEO shops.",
    url: "https://autofivestar.com/agencies",
    type: "website",
  },
};

const pro = PLAN_CONFIG.pro;

const FEATURES = [
  {
    title: "White-label client experience",
    body: "Your brand on the dashboard, your domain on review-request emails, your logo on the audit reports your clients see.",
  },
  {
    title: "Multi-client billing made simple",
    body: "One Pro subscription covers up to 10 locations. Bill your clients however you want — flat, per-location, or as part of a retainer.",
  },
  {
    title: "Bulk operations across clients",
    body: "Generate drafts, post responses, mark skipped, or export CSVs across multiple client locations from one inbox.",
  },
  {
    title: "API access for your stack",
    body: "Plug review data into your client reporting, your CRM, or your own retention dashboards.",
  },
  {
    title: "Free audits as a sales tool",
    body: "Run the audit on a prospect's Google profile in two minutes. Use the score and punch list as the cold-call opener.",
  },
  {
    title: "Industry packs out of the box",
    body: "Ten pre-tuned industry voices (HVAC, dental, restaurants, dealerships, and more) so you can onboard a new client in under an hour.",
  },
];

const FAQ = [
  {
    q: "Can my clients see my brand instead of AutoFiveStar?",
    a: "Yes. White-label is included on the Pro plan. Your logo, your colors, your domain on the client-facing review-request emails.",
  },
  {
    q: "How do you handle billing for me vs. my client?",
    a: "You pay AutoFiveStar one Pro subscription per 10 locations. You bill your clients on whatever terms work for your agency — flat retainer, per-location, or as part of a bigger package.",
  },
  {
    q: "Can I run audits on prospects before they're clients?",
    a: "Yes. The Free Reputation Audit is unlimited and works on any business with a public Google profile. Use the report as the wedge to open a sales conversation.",
  },
  {
    q: "What if I have more than 10 clients?",
    a: "Contact us — we offer custom enterprise pricing for agencies managing more than 10 locations.",
  },
  {
    q: "Is there an agency partner program?",
    a: "We're rolling one out. Get on the list with the form below and you'll be invited first.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function AgenciesPage() {
  const monthlyPrice = centsToUsd(pro.priceMonthlyCents);
  const perLocation = centsToUsd(Math.round(pro.priceMonthlyCents / 10));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section className="relative isolate overflow-hidden">
        <BrandGlow intensity="bold" />
        <div className="container relative mx-auto px-6 pt-20 pb-16 text-center md:pt-28 md:pb-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            For agencies & local SEO shops
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Sell review management{" "}
            <span className="text-brand-gradient">as your own.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
            Add reputation management to your retainer without building or
            buying a product. The Pro plan gives you a white-label dashboard,
            multi-client billing, bulk operations, and API access — all for{" "}
            {monthlyPrice}/mo.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="brand">
              <Link href="/signup?plan=pro">Start 14-day Pro trial</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/contact?topic=agency">Book agency demo</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            14-day free trial · Cancel anytime
          </p>
        </div>
      </section>

      {/* ROI math */}
      <section className="border-y bg-secondary/40">
        <div className="container mx-auto px-6 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              The agency math
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {monthlyPrice}/mo covers 10 client locations
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              That&apos;s {perLocation}/mo per location at cost. Charge your
              clients {centsToUsd(14900)}/mo per location and you keep a clean
              margin on a product that runs itself.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-3">
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle className="text-sm">Your cost</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {monthlyPrice}
                </p>
                <p className="text-xs text-muted-foreground">/ month total</p>
              </CardContent>
            </Card>
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle className="text-sm">Client price</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {centsToUsd(14900)}
                </p>
                <p className="text-xs text-muted-foreground">/ client / month</p>
              </CardContent>
            </Card>
            <Card className="ring-brand-glow border-primary/40">
              <CardHeader>
                <CardTitle className="text-sm">Your margin (10 clients)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {centsToUsd(14900 * 10 - pro.priceMonthlyCents)}
                </p>
                <p className="text-xs text-muted-foreground">/ month</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Everything an agency needs to{" "}
          <span className="text-brand-gradient">resell reviews</span>
        </h2>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="hover-lift">
              <CardHeader>
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="border-y bg-secondary/30">
        <div className="container mx-auto px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            How agencies use AutoFiveStar
          </h2>
          <ol className="mt-12 grid gap-4 md:grid-cols-4">
            {[
              {
                n: 1,
                title: "Run a free audit on a prospect",
                body: "Two minutes. Score plus punch list. Use it as your opener.",
              },
              {
                n: 2,
                title: "Close the client",
                body: "Show them the report. Pitch a monthly retainer that includes review management.",
              },
              {
                n: 3,
                title: "Onboard in under an hour",
                body: "Connect Google, pick the industry pack, tune brand voice. Done.",
              },
              {
                n: 4,
                title: "Bill them every month",
                body: "Reviews stay answered. Reputation improves. The retainer pays for itself.",
              },
            ].map((s) => (
              <li
                key={s.n}
                className="hover-lift rounded-xl border bg-card p-5 shadow-card-soft"
              >
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {s.n}
                </div>
                <p className="mt-3 font-semibold">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Agency FAQ
        </h2>
        <div className="mx-auto mt-10 max-w-3xl space-y-4">
          {FAQ.map(({ q, a }) => (
            <Card key={q}>
              <CardHeader>
                <CardTitle className="text-base">{q}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {a}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative isolate overflow-hidden border-t bg-brand-navy text-white">
        <BrandGlow intensity="bold" />
        <div className="container relative mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Stop sending clients to a competitor.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">
            Add review management to your retainer this week. 14-day free
            trial, no credit card required.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="brand">
              <Link href="/signup?plan=pro">Start 14-day Pro trial</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-white/0 text-white hover:bg-white/10"
            >
              <Link href="/contact?topic=agency">Talk to sales</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
