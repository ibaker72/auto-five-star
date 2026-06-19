import type { Metadata } from "next";
import Link from "next/link";
import {
  BellRing,
  ClipboardList,
  MessageSquareText,
  Star,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandGlow } from "@/components/ui/brand-glow";
import { AnimatedStars } from "@/components/ui/animated-stars";
import { AuditForm } from "../free-audit/audit-form";

export const metadata: Metadata = {
  title: "Free Review Audit for Local Businesses",
  description:
    "A free review audit for local businesses: your review score, bad review risk, competitor rating gap, and a punch list of what to fix first. No credit card.",
  alternates: { canonical: "https://autofivestar.com/free-review-audit" },
  openGraph: {
    title: "Free Review Audit for Local Businesses",
    description:
      "See your review score, competitor gap, and missed opportunities in two minutes. No credit card.",
    type: "website",
    images: ["/opengraph-image"],
  },
};

const CHECKS = [
  {
    icon: Star,
    title: "Your review score",
    body: "A 0–100 reputation score with a letter grade.",
  },
  {
    icon: BellRing,
    title: "Bad review risk",
    body: "Where negative or unanswered reviews are costing you.",
  },
  {
    icon: MessageSquareText,
    title: "Missed response opportunities",
    body: "Reviews that should have a reply but don't.",
  },
  {
    icon: Trophy,
    title: "Competitor rating gap",
    body: "How you compare to similar businesses nearby.",
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

export default function FreeReviewAuditLandingPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <BrandGlow intensity="bold" />
        <div className="container relative mx-auto grid gap-10 px-6 pt-16 pb-12 md:grid-cols-[1.1fr,1fr] md:items-start md:pt-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <AnimatedStars rating={5} animated size="sm" />
              Free · No credit card
            </span>
            <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Free Review Audit for{" "}
              <span className="text-brand-gradient">Local Businesses</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              In about two minutes, see exactly where your online reputation
              stands — your review score, your competitor gap, and the quickest
              wins to grow more five-star reviews.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                "Know your reputation score and grade",
                "See how you stack up against nearby competitors",
                "Get a prioritized punch list you can act on today",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    ✓
                  </span>
                  <span className="text-foreground">{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 hidden md:block">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Built for restaurants, contractors, salons, med spas, clinics,
                auto shops, dentists &amp; home services.
              </p>
            </div>
          </div>

          <Card className="shadow-card-lift">
            <CardHeader>
              <CardTitle>Start your free audit</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditForm />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-y bg-secondary/30">
        <div className="container mx-auto px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              What the audit checks
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Everything you receive in your free report.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CHECKS.map((c) => (
              <div
                key={c.title}
                className="hover-lift rounded-xl border bg-card p-5 shadow-card-soft"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <p className="font-semibold tracking-tight">{c.title}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-t bg-brand-navy text-white">
        <BrandGlow intensity="bold" />
        <div className="container relative mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            See your score in two minutes
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">
            No credit card. We email you the full report and a punch list of
            what to fix first.
          </p>
          <div className="mt-6 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
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
    </>
  );
}
