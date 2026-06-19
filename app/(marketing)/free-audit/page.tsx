import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditForm } from "./audit-form";

export const metadata: Metadata = {
  title: "Free Reputation Audit",
  description:
    "Get a free reputation score for your local business in two minutes. We email a score, strengths, opportunities, and a punch list.",
  alternates: { canonical: "https://autofivestar.com/free-audit" },
  openGraph: {
    title: "Free reputation audit",
    description:
      "Score your Google reputation in two minutes. No credit card required.",
    type: "website",
    images: ["/opengraph-image"],
  },
};

const CHECKS = [
  "Your review score (0–100)",
  "Bad review risk",
  "Missed response opportunities",
  "Competitor rating gap",
  "Review growth opportunities",
  "Recommended next steps",
];

export default function FreeAuditPage() {
  return (
    <section className="container mx-auto px-6 pt-16 pb-16 md:pt-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Free review audit for local businesses
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Two minutes. No credit card. We email you a reputation score, your
          competitor gap, and a punch list of what to fix first.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-[1fr,1.1fr]">
        <Card className="h-fit bg-secondary/30">
          <CardHeader>
            <CardTitle className="text-lg">What your audit checks</CardTitle>
            <CardDescription>
              A real preview of where your reputation stands today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {CHECKS.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    ✓
                  </span>
                  <span className="text-foreground">{c}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Tell us about your business</CardTitle>
              <CardDescription>
                We use this to generate your report — and only this.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditForm />
            </CardContent>
          </Card>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            We can&apos;t read live Google reviews for non-customers yet, so your
            first report uses a representative sample clearly labeled
            &ldquo;sample preview.&rdquo; Start a plan to connect your profile
            and see your live numbers.
          </p>
        </div>
      </div>
    </section>
  );
}
