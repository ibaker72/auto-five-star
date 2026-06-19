import type { Metadata } from "next";
import Link from "next/link";
import {
  AlarmClock,
  BellRing,
  ClipboardList,
  Link2,
  MessageSquareText,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
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
    "Get instant review alerts, AI-powered responses, review-request automation, analytics, and reputation monitoring for your local business. Start with a free review audit.",
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
      "AI-powered review replies plus review-request automation for local businesses. Start your free review audit.",
    images: ["/twitter-image"],
  },
  alternates: { canonical: "https://autofivestar.com/" },
};

const FAQ = [
  {
    q: "What is the free audit?",
    a: "A quick reputation snapshot for your business. We score your Google review profile and email you a report with your strengths, risks, competitor gap, and a punch list of what to fix first. It takes about two minutes to request.",
  },
  {
    q: "Do I need a credit card?",
    a: "No. The free review audit never asks for a card. You only enter payment details if you decide to start a paid plan later.",
  },
  {
    q: "Does this post replies automatically?",
    a: "No — you stay in control. AutoFiveStar drafts on-brand replies for you, but nothing is posted to Google until you review and approve it.",
  },
  {
    q: "Is it safe with Google?",
    a: "Yes. We connect through Google's official Business Profile API with read and reply access you authorize. We never scrape, automate fake reviews, or do anything against Google's policies.",
  },
  {
    q: "What types of businesses is this for?",
    a: "Local service businesses — restaurants, contractors, salons, med spas, clinics, auto shops, dentists, and home services. If your customers find you on Google, AutoFiveStar fits.",
  },
  {
    q: "How long does setup take?",
    a: "About 10 minutes to connect your Google Business Profile. On Growth and Reputation Guard we set it up with you so it's ready the same day.",
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

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Hero />
      <DemoSection />
      <WhyUse />
      <HowItWorks />
      <FreeAuditValue />
      <WhoItsFor />
      <FeatureShowcase />
      <PricingPreview />
      <Faq />
      <FinalCta />
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
        <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Button asChild size="lg" variant="brand" className="w-full sm:w-auto">
            <Link href="/free-audit">Start Free Audit</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href="/contact?topic=demo">Book Demo</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          No credit card to run the audit · Built for US local businesses
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
            A peek at the dashboards, alerts, and reports you&apos;ll use every
            week. Everything below is clearly labeled sample data — never real
            customer reviews.
          </p>
        </div>
        <div className="mt-10">
          <DemoPanels />
        </div>
        <div className="mt-10 text-center">
          <Button asChild size="lg" variant="brand">
            <Link href="/free-audit">Start Free Audit</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function WhyUse() {
  const pains = [
    {
      icon: BellRing,
      title: "Bad reviews slip through",
      body: "A 1-star review can sit for days before you notice. By then the next prospect has already seen it.",
    },
    {
      icon: AlarmClock,
      title: "Replies are slow or skipped",
      body: "Writing a thoughtful reply to every review takes time you don't have, so most go unanswered.",
    },
    {
      icon: Link2,
      title: "Review requests are inconsistent",
      body: "You mean to ask happy customers for a review, but it never happens the same way twice.",
    },
    {
      icon: Trophy,
      title: "Competitors have more reviews",
      body: "The shop down the street keeps showing up higher because they simply have more recent reviews.",
    },
    {
      icon: TrendingUp,
      title: "No weekly visibility",
      body: "You can't tell if your reputation is improving week to week — there's no simple scoreboard.",
    },
  ];
  return (
    <section className="border-y bg-secondary/40">
      <div className="container mx-auto px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Why local businesses use AutoFiveStar
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            The everyday reputation problems we take off your plate.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pains.map((p) => (
            <div
              key={p.title}
              className="hover-lift rounded-xl border bg-card p-5 shadow-card-soft"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <p.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 font-semibold tracking-tight">{p.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Link2,
      title: "Connect your Google Business Profile",
      body: "Connect in one click or just enter your profile. We start tracking your reviews right away.",
    },
    {
      icon: BellRing,
      title: "Get review alerts and AI response drafts",
      body: "We alert you the moment a review lands and draft on-brand replies you can approve in seconds.",
    },
    {
      icon: Star,
      title: "Grow more five-star reviews",
      body: "Send simple requests to happy customers by email, SMS, or QR code and watch the good reviews roll in.",
    },
  ];
  return (
    <section className="container mx-auto px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          How it works
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Up and running in three simple steps.
        </p>
      </div>
      <ol className="mt-12 grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="hover-lift relative rounded-xl border bg-card p-6 shadow-card-soft"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-brand-cyan text-sm font-bold text-white">
                {i + 1}
              </span>
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-4 font-semibold tracking-tight">{s.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-10 text-center">
        <Button asChild size="lg" variant="brand">
          <Link href="/free-audit">Start Free Audit</Link>
        </Button>
      </div>
    </section>
  );
}

function FreeAuditValue() {
  const items = [
    {
      icon: Star,
      title: "Your review score",
      body: "A clear 0–100 reputation score with a letter grade.",
    },
    {
      icon: BellRing,
      title: "Bad review risk",
      body: "Where unanswered or negative reviews are quietly costing you.",
    },
    {
      icon: MessageSquareText,
      title: "Missed response opportunities",
      body: "Reviews sitting without a reply that should have one.",
    },
    {
      icon: Trophy,
      title: "Competitor rating gap",
      body: "How your rating and review count stack up nearby.",
    },
    {
      icon: TrendingUp,
      title: "Review growth opportunities",
      body: "The fastest ways to earn more five-star reviews.",
    },
    {
      icon: ClipboardList,
      title: "Recommended next steps",
      body: "A short, prioritized punch list you can act on today.",
    },
  ];
  return (
    <section className="relative isolate overflow-hidden border-y bg-gradient-to-b from-background to-secondary/30">
      <BrandGlow intensity="subtle" />
      <div className="container relative mx-auto px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-4 w-4" /> Free audit
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            What you get in your free audit
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            A real preview of your reputation — no account or credit card
            required.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="hover-lift rounded-xl border bg-card p-5 shadow-card-soft"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <it.icon className="h-5 w-5" />
                </span>
                <p className="font-semibold tracking-tight">{it.title}</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{it.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button asChild size="lg" variant="brand">
            <Link href="/free-audit">Start Free Audit</Link>
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Takes about two minutes · We email you the full report.
          </p>
        </div>
      </div>
    </section>
  );
}

function WhoItsFor() {
  const audiences = [
    "Restaurants",
    "Contractors",
    "Salons",
    "Med spas",
    "Clinics",
    "Auto shops",
    "Dentists",
    "Home services",
    "Local service businesses",
  ];
  return (
    <section className="container mx-auto px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Users className="h-4 w-4" /> Who it&apos;s for
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Built for local businesses that live on reviews
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          If customers find you on Google, AutoFiveStar helps you win more of
          them.
        </p>
      </div>
      <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2.5">
        {audiences.map((a) => (
          <span
            key={a}
            className="rounded-full border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-card-soft"
          >
            {a}
          </span>
        ))}
      </div>
    </section>
  );
}

function PricingPreview() {
  return (
    <section className="border-y bg-secondary/30">
      <div className="container mx-auto px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Software <span className="text-brand-gradient">plus a team</span> behind you
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Pick a plan that does the work with you, not just for you. Cancel
            anytime.
          </p>
          <p className="mt-3 inline-block rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            Founding client pricing available for the first local businesses.
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
                    <Link href="/free-audit">Start Free Audit</Link>
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
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="container mx-auto px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Frequently asked questions
        </h2>
      </div>
      <div className="mx-auto mt-10 max-w-3xl space-y-3">
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
  );
}

function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden border-t bg-brand-navy text-white">
      <BrandGlow intensity="bold" />
      <div className="container relative mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Get your free review audit
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">
          Two minutes, no credit card. We&apos;ll email you a score and a punch
          list of what to fix first.
        </p>
        <div className="mt-6 flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Button asChild size="lg" variant="brand" className="w-full sm:w-auto">
            <Link href="/free-audit">Start Free Audit</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full bg-white/0 text-white hover:bg-white/10 sm:w-auto"
          >
            <Link href="/contact?topic=demo">Book Demo</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
