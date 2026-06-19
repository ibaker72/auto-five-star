import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandGlow } from "@/components/ui/brand-glow";
import { centsToUsd } from "@/lib/utils";
import { PLAN_CONFIG, PLANS } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Starter $99/mo, Growth $199/mo, Reputation Guard $399/mo. Software plus a done-with-you team. Founding client pricing available.",
  alternates: { canonical: "https://autofivestar.com/pricing" },
  openGraph: {
    title: "AutoFiveStar pricing",
    description:
      "Software plus a team behind your reviews. Cancel anytime. Founding client pricing available.",
    type: "website",
    images: ["/opengraph-image"],
  },
};

const FAQ = [
  {
    q: "Is this just software, or do you help?",
    a: "Both. AutoFiveStar is software plus a service. Growth and Reputation Guard include done-with-you setup, and Reputation Guard adds a monthly strategy call and hands-on response help.",
  },
  {
    q: "How does the free review audit work?",
    a: "Run it from the Free Audit page. We email a score and a punch list in seconds — no credit card required. It's the best way to see the value before you pick a plan.",
  },
  {
    q: "Do replies post to Google automatically?",
    a: "No. We draft on-brand replies, but you review and approve everything before it posts. You always stay in control.",
  },
  {
    q: "Can I change or cancel plans?",
    a: "Yes — upgrade, downgrade, or cancel anytime from the billing portal. Annual plans get two months free.",
  },
  {
    q: "Do you guarantee five-star reviews?",
    a: "No. AutoFiveStar helps you respond professionally and request reviews consistently. We do not guarantee ratings, rankings, or revenue.",
  },
  {
    q: "What is founding client pricing?",
    a: "We're onboarding a first group of local businesses at locked-in launch pricing. Mention it on your setup call and we'll let you know what's available.",
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

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <section className="relative isolate overflow-hidden">
        <BrandGlow intensity="subtle" />
        <div className="container relative mx-auto px-6 pt-20 pb-12 text-center md:pt-28">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Software <span className="text-brand-gradient">plus a team</span> behind you
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Every plan combines the AutoFiveStar app with real help getting it
            working. Annual plans get two months free. Cancel anytime.
          </p>
          <p className="mt-4 inline-block rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            Founding client pricing available for the first local businesses.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((id) => {
            const plan = PLAN_CONFIG[id];
            const yearly = centsToUsd(plan.priceYearlyCents);
            const highlighted = id === "growth";
            return (
              <Card
                key={id}
                className={
                  highlighted
                    ? "ring-brand-glow border-primary/40"
                    : "hover-lift"
                }
              >
                <CardHeader>
                  <CardTitle className="text-lg">
                    {plan.name}
                    {highlighted ? (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                        Most popular
                      </span>
                    ) : null}
                  </CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-semibold tabular-nums text-foreground">
                      {centsToUsd(plan.priceMonthlyCents)}
                    </span>{" "}
                    / month
                    <div className="text-xs">or {yearly} / year</div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {plan.features.map((f) => (
                      <li key={f}>· {f}</li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className="w-full"
                    variant={highlighted ? "brand" : "outline"}
                  >
                    <Link href={`/signup?plan=${id}`}>Start 14-day trial</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
          Not ready to start a trial? Run the free review audit first — no card
          required.
        </p>
      </section>

      <section className="container mx-auto px-6 pb-16">
        <h2 className="text-center text-2xl font-bold tracking-tight">FAQ</h2>
        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {FAQ.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-xl border bg-card p-5 shadow-card-soft"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
                {q}
                <span className="text-primary transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-t bg-gradient-to-b from-secondary/40 to-background">
        <BrandGlow intensity="subtle" />
        <div className="container relative mx-auto px-6 py-14 text-center">
          <p className="text-base font-medium">Not sure where to start?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Run the free review audit first — it takes two minutes.
          </p>
          <div className="mt-4 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="brand" size="lg" className="w-full sm:w-auto">
              <Link href="/free-audit">Start Free Audit</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/contact?topic=demo">Book Demo</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
