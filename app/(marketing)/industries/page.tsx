import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandGlow } from "@/components/ui/brand-glow";
import { getIndustryPack } from "@/lib/templates/industry-packs";
import { listIndustrySeo } from "@/lib/templates/industry-seo";

export const metadata: Metadata = {
  title: "Review management by industry",
  description:
    "Industry-tuned AI review management for HVAC, plumbing, roofing, dental, restaurants, gyms, dealerships, and more.",
  alternates: { canonical: "https://autofivestar.com/industries" },
  openGraph: {
    title: "AutoFiveStar — built for your industry",
    description:
      "Industry-tuned review responses and review-request automation for local businesses.",
    url: "https://autofivestar.com/industries",
    type: "website",
  },
};

export default function IndustriesIndexPage() {
  const entries = listIndustrySeo();
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <BrandGlow intensity="subtle" />
        <div className="container relative mx-auto px-6 pt-20 pb-12 text-center md:pt-28">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Built for{" "}
            <span className="text-brand-gradient">your industry</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Each industry has its own tone, its own caution phrases, and its
            own way of saying thank you. AutoFiveStar ships with ten pre-tuned
            response styles — and you can tune them further from your
            dashboard.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => {
            const pack = getIndustryPack(entry.packId);
            return (
              <Card key={entry.slug} className="hover-lift">
                <CardHeader>
                  <CardTitle className="text-lg">
                    <span className="mr-2" aria-hidden>
                      {pack?.emoji ?? "⭐"}
                    </span>
                    {pack?.name ?? entry.slug}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {pack?.shortDescription ?? entry.metaDescription}
                  </p>
                  <Link
                    href={`/industries/${entry.slug}`}
                    className="text-sm font-medium text-primary underline"
                  >
                    See {pack?.name ?? entry.slug} details →
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-t bg-gradient-to-b from-secondary/40 to-background">
        <BrandGlow intensity="subtle" />
        <div className="container relative mx-auto px-6 py-14 text-center">
          <p className="text-base font-medium">Don&apos;t see your industry?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The General Local Business template covers everything else.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="brand">
              <Link href="/free-audit">Start free audit</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
