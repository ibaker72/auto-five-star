import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { centsToUsd } from "@/lib/utils";
import { PLAN_CONFIG, PLANS } from "@/lib/billing/plans";
import { getCurrentUser } from "@/lib/auth/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Never Miss a Bad Review Again",
  description:
    "Get instant review alerts, AI-powered responses, analytics, and reputation monitoring for your business. Start your free reputation audit.",
  openGraph: {
    title: "AutoFiveStar — Never Miss a Bad Review Again",
    description:
      "Instant review alerts, AI-powered replies, analytics, and reputation monitoring for local businesses.",
    url: "https://autofivestar.com",
    siteName: "AutoFiveStar",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoFiveStar — Never Miss a Bad Review Again",
    description:
      "AI-powered review replies for local businesses. Start your free reputation audit.",
  },
  alternates: { canonical: "https://autofivestar.com/" },
};

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <Hero />
      <Problem />
      <Solution />
      <HowItWorks />
      <PricingPreview />
      <Cta />
    </>
  );
}

function Hero() {
  return (
    <section className="container mx-auto px-6 pt-16 pb-12 text-center md:pt-24 md:pb-16">
      <span className="inline-block rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
        AutoFiveStar · for local businesses
      </span>
      <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
        Never Miss a Bad Review Again
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
        Get instant review alerts, AI-powered responses, analytics, and
        reputation monitoring for your business.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/free-audit">Start Free Audit</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/contact?topic=demo">Book Demo</Link>
        </Button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        14-day free trial · No credit card to run the audit · US businesses
      </p>
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
    <div>
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
      title: "Reputation Analytics",
      body: "Score, ratings distribution, weekly trend, and response rate — at a glance.",
    },
  ];
  return (
    <section className="container mx-auto px-6 py-16">
      <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
        Everything you need to stay on top of your reviews
      </h2>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader>
              <CardTitle className="text-lg">{c.title}</CardTitle>
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
      title: "Improve Reputation",
      body: "Watch response rate, trend, and rating distribution improve week over week.",
    },
  ];
  return (
    <section className="border-y bg-secondary/30">
      <div className="container mx-auto px-6 py-16">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          How it works
        </h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-4">
          {steps.map((s) => (
            <li
              key={s.n}
              className="rounded-md border bg-card p-4"
            >
              <div className="text-xs font-medium text-muted-foreground">
                Step {s.n}
              </div>
              <p className="mt-1 font-medium">{s.title}</p>
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
    <section className="container mx-auto px-6 py-16">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Simple, owner-friendly pricing
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          14-day free trial. Cancel anytime. Annual plans get 2 months free.
        </p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PLANS.map((id) => {
          const plan = PLAN_CONFIG[id];
          return (
            <Card key={id}>
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-2xl font-semibold text-foreground">
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
                <Button asChild className="w-full" variant={id === "growth" ? "default" : "outline"}>
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
    <section className="border-t bg-primary/5">
      <div className="container mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Get Your Free Reputation Audit
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Two minutes, no credit card. We'll email a score and a punch list
          of what to fix first.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/free-audit">Start Free Audit</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/features">See features →</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
