import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Review monitoring, AI-powered replies, analytics, and bulk actions. Built for HVAC, dentists, restaurants, and other local businesses.",
  alternates: { canonical: "https://autofivestar.com/features" },
  openGraph: {
    title: "AutoFiveStar features",
    description:
      "Pull Google reviews every 15 minutes. AI drafts three reply variants. Analytics and alerts that owners actually open.",
    type: "website",
  },
};

const FEATURES = [
  {
    title: "Review syncing",
    body: "We pull your Google Business Profile reviews every 15 minutes and keep status in sync.",
    bullets: [
      "Google Business Profile via OAuth",
      "Yelp Fusion (read-only)",
      "Manual pull on demand",
    ],
  },
  {
    title: "AI response drafts",
    body: "Three on-brand variants per review (warm, professional, brief) tuned to your industry pack and brand voice.",
    bullets: [
      "gpt-4o by default",
      "Industry-aware caution phrases",
      "One-click approve and post to Google",
    ],
  },
  {
    title: "Instant alerts",
    body: "Email the moment a review lands. SMS for 1–2 star reviews on Growth and Pro plans.",
    bullets: [
      "Per-user email and SMS toggles",
      "Owner-friendly digest queues for positives",
      "No alerts on Sundays unless urgent",
    ],
  },
  {
    title: "Analytics",
    body: "Score, ratings distribution, weekly trend, and response rate — at a glance.",
    bullets: [
      "Rating distribution",
      "8-week trend",
      "Response rate %, urgent count",
    ],
  },
  {
    title: "Bulk actions (Pro)",
    body: "Operate at agency scale: bulk generate drafts, post selected, export CSV.",
    bullets: [
      "Bulk generate AI drafts",
      "Bulk post-to-Google",
      "Export selected to CSV",
    ],
  },
  {
    title: "Onboarding wizard",
    body: "Six steps to ship-ready in under five minutes — industry pack, brand voice, alerts.",
    bullets: [
      "10 industry packs",
      "Tone preset + length + emoji policy",
      "Signature and custom voice notes",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="container mx-auto px-6 pt-16 pb-10 text-center md:pt-24">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Built for owners who don't have time to babysit a dashboard
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-muted-foreground">
          AutoFiveStar handles the review loop end-to-end: alert, draft,
          approve, post, repeat.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/free-audit">Start Free Audit</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/signup">Start 14-day trial</Link>
          </Button>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <CardTitle className="text-lg">{f.title}</CardTitle>
                <CardDescription>{f.body}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {f.bullets.map((b) => (
                    <li key={b}>· {b}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
