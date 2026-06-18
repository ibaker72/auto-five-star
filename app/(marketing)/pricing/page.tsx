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
    "Starter $49/mo, Growth $99/mo, Pro $199/mo. 14-day free trial. Annual plans get 2 months free.",
  alternates: { canonical: "https://autofivestar.com/pricing" },
  openGraph: {
    title: "AutoFiveStar pricing",
    description:
      "Simple, owner-friendly pricing. 14-day free trial. Cancel anytime.",
    type: "website",
    images: ["/opengraph-image"],
  },
};

const FAQ = [
  {
    q: "Is there a free trial?",
    a: "Yes — 14 days on any plan. No charge until day 15. You can cancel from the Stripe Customer Portal at any point.",
  },
  {
    q: "What does the AI cost?",
    a: "AI usage is included. Starter caps at 50 AI responses per month; Growth and Pro are unlimited.",
  },
  {
    q: "How does the Free Reputation Audit work?",
    a: "Run it from the Free Audit page. We send a score and a punch list to your email in seconds. No card required.",
  },
  {
    q: "Do you guarantee 5-star reviews?",
    a: "No. AutoFiveStar helps you respond professionally and consistently. We do not guarantee ratings, rankings, or revenue.",
  },
  {
    q: "Can I post replies to Yelp?",
    a: "Yelp does not allow API posting. We pull Yelp reviews read-only on Growth and Pro, and you can copy AI-drafted replies to paste manually.",
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
            Simple, <span className="text-brand-gradient">owner-friendly</span> pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            14-day free trial. Annual plans get 2 months free. Cancel anytime.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((id) => {
            const plan = PLAN_CONFIG[id];
            const yearly = centsToUsd(plan.priceYearlyCents);
            return (
              <Card
                key={id}
                className={
                  id === "growth"
                    ? "ring-brand-glow border-primary/40"
                    : "hover-lift"
                }
              >
                <CardHeader>
                  <CardTitle className="text-lg">
                    {plan.name}
                    {id === "growth" ? (
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
                    variant={id === "growth" ? "brand" : "outline"}
                  >
                    <Link href={`/signup?plan=${id}`}>Start 14-day trial</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto px-6 pb-16">
        <h2 className="text-center text-2xl font-bold tracking-tight">FAQ</h2>
        <div className="mx-auto mt-8 max-w-3xl space-y-4">
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

      <section className="relative isolate overflow-hidden border-t bg-gradient-to-b from-secondary/40 to-background">
        <BrandGlow intensity="subtle" />
        <div className="container relative mx-auto px-6 py-14 text-center">
          <p className="text-base font-medium">Not sure where to start?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Run the free reputation audit first.
          </p>
          <div className="mt-4">
            <Button asChild variant="brand">
              <Link href="/free-audit">Start Free Audit</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
