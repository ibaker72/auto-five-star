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

export default function FreeAuditPage() {
  return (
    <section className="container mx-auto px-6 pt-16 pb-16 md:pt-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Free reputation audit
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Two minutes. No credit card. We email a reputation score, strengths,
          opportunities, and a punch list of what to fix first.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-xl">
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
          We don't have direct access to Google reviews for non-customers yet,
          so the first report uses a representative sample with a clear
          "demo data" label. Sign up for the trial to see your live numbers.
        </p>
      </div>
    </section>
  );
}
