import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandGlow } from "@/components/ui/brand-glow";
import { AnimatedStars } from "@/components/ui/animated-stars";
import { DemoPanels } from "@/components/marketing/demo-panels";
import { FeatureShowcase } from "@/components/marketing/feature-showcase";
import { centsToUsd } from "@/lib/utils";
import { PLAN_CONFIG, PLANS } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Never Miss a Bad Review Again",
  description:
    "Get instant review alerts, AI-powered responses, review-request automation, analytics, and reputation monitoring for your local business.",
  openGraph: {
    title: "AutoFiveStar — Review Growth Engine",
    description:
      "Instant review alerts, AI-powered replies, review-request automation, and analytics for local businesses.",
    url: "https://autofivestar.com",
    siteName: "AutoFiveStar",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoFiveStar — Review Growth Engine",
    description:
      "AI-powered review replies plus review-request automation for local businesses. Start your free reputation audit.",
    images: ["/twitter-image"],
  },
  alternates: { canonical: "https://autofivestar.com/" },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <DemoSection />
      <Problem />
      <Solution />
      <FeatureShowcase />
      <HowItWorks />
      <PricingPreview />
      <Cta />
    </>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <BrandGlow intensity="bold" />
      <div className="container relative mx-auto px-6 pt-20 pb-16 text-center md:pt-28 md:pb-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <AnimatedStars rating={5} animated size="sm" />
          Review growth engine for local businesses
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          <span className="text-brand-gradient">Never miss a bad review.</span>
          <br />
          <span className="text-foreground">Grow the good ones.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          Instant review alerts, AI-powered responses tuned to your brand
          voice, and review-request automation that turns happy customers into
          five-star reviews.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" variant="brand">
            <Link href="/free-audit">Start Free Audit</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/contact?topic=demo">Book Demo</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          14-day free trial · No credit card to run the audit · US businesses
        </p>
      </div>
    </section>
  );
}

function DemoSection() {
  return (
    <section className="relative border-y bg-gradient-to-b from-secondary/30 via-background to-background">
      <div className="container mx-auto px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            See it in action
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            See AutoFiveStar in action
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            A peek at the dashboards and alerts you&apos;ll use every week.
            All copy and ratings below are sample content — never real
            customer reviews.
          </p>
        </div>
        <div className="mt-10">
          <DemoPanels />
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="border-y bg-secondary/40">
      <div className="container mx-auto grid gap-6 px-6 py-16 md:grid-cols-3">
        <ProblemCard
          title="Bad reviews go unanswered"
          body="Most owners don't see negative reviews until customers do. Quiet profiles read like abandoned ones."
        />
        <ProblemCard
          title="Owners find out too late"
          body="By the time a 1-star review surfaces, the next prospect has already scrolled past."
        />
        <ProblemCard
          title="Reputation impacts revenue"
          body="A jump of half a star can change buying decisions. Unanswered reviews compound."
        />
      </div>
    </section>
  );
}

function ProblemCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card-soft transition-shadow hover:shadow-card-lift">
      <p className="text-sm font-semibold tracking-tight">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Solution() {
  const cards = [
    {
      title: "Instant Alerts",
      body: "Email the moment a review lands. SMS for negative reviews on Growth and Pro plans.",
    },
    {
      title: "AI Review Responses",
      body: "Three on-brand draft variants per review. Approve and post to Google in one click.",
    },
    {
      title: "Review Request Engine",
      body: "Send single sends, bulk CSV campaigns, or print a QR code. Built-in industry templates.",
    },
    {
      title: "Reputation Analytics",
      body: "Score, ratings distribution, weekly trend, and response rate — at a glance.",
    },
  ];
  return (
    <section className="container mx-auto px-6 py-20">
      <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
        Everything you need to{" "}
        <span className="text-brand-gradient">stay on top of reviews</span>
      </h2>
      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title} className="hover-lift">
            <CardHeader>
              <CardTitle className="text-base">{c.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{c.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: 1,
      title: "Connect Google Business Profile",
      body: "One-click OAuth. We pull your reviews every 15 minutes.",
    },
    {
      n: 2,
      title: "Monitor Reviews",
      body: "Negative reviews trigger instant alerts. Positives are batched into digests.",
    },
    {
      n: 3,
      title: "Respond Faster",
      body: "AI drafts three variants tuned to your brand voice. You approve. We post.",
    },
    {
      n: 4,
      title: "Grow Reviews",
      body: "Send requests by email, SMS, or QR. Watch response rate, trend, and rating improve.",
    },
  ];
  return (
    <section className="border-y bg-secondary/30">
      <div className="container mx-auto px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          How it works
        </h2>
        <ol className="mt-12 grid gap-4 md:grid-cols-4">
          {steps.map((s) => (
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
  );
}

function PricingPreview() {
  return (
    <section className="container mx-auto px-6 py-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Simple, owner-friendly pricing
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          14-day free trial. Cancel anytime. Annual plans get 2 months free.
        </p>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {PLANS.map((id) => {
          const plan = PLAN_CONFIG[id];
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
      <div className="mt-6 text-center">
        <Link href="/pricing" className="text-sm text-primary underline">
          See full pricing details →
        </Link>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="relative isolate overflow-hidden border-t bg-brand-navy text-white">
      <BrandGlow intensity="bold" />
      <div className="container relative mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Get your free reputation audit
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">
          Two minutes, no credit card. We&apos;ll email a score and a punch
          list of what to fix first.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" variant="brand">
            <Link href="/free-audit">Start Free Audit</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="bg-white/0 text-white hover:bg-white/10">
            <Link href="/features">See features →</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
