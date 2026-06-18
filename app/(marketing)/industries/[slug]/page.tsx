import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandGlow } from "@/components/ui/brand-glow";
import { AnimatedStars } from "@/components/ui/animated-stars";
import { getIndustryPack } from "@/lib/templates/industry-packs";
import {
  INDUSTRY_SEO_SLUGS,
  getIndustrySeo,
  listIndustrySeo,
} from "@/lib/templates/industry-seo";
import { centsToUsd } from "@/lib/utils";
import { PLAN_CONFIG } from "@/lib/billing/plans";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return INDUSTRY_SEO_SLUGS.map((slug) => ({ slug }));
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const seo = getIndustrySeo(slug);
  if (!seo) return {};
  const canonical = `https://autofivestar.com/industries/${seo.slug}`;
  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
    alternates: { canonical },
    openGraph: {
      title: seo.metaTitle,
      description: seo.metaDescription,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.metaTitle,
      description: seo.metaDescription,
    },
  };
}

export default async function IndustryPage({ params }: PageProps) {
  const { slug } = await params;
  const seo = getIndustrySeo(slug);
  if (!seo) notFound();

  const pack = getIndustryPack(seo.packId);
  const growthPlan = PLAN_CONFIG.growth;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: seo.faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  const otherIndustries = listIndustrySeo()
    .filter((entry) => entry.slug !== seo.slug)
    .slice(0, 6);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <BrandGlow intensity="bold" />
        <div className="container relative mx-auto px-6 pt-20 pb-16 text-center md:pt-28 md:pb-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <span aria-hidden>{pack?.emoji ?? "⭐"}</span>
            {pack?.name ?? "Local business"} · Review growth engine
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-brand-gradient">{seo.headline}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
            {seo.subhead}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="brand">
              <Link href="/free-audit">Get free reputation audit</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={`/signup?plan=growth`}>Start 14-day trial</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            14-day free trial · No credit card to run the audit
          </p>
        </div>
      </section>

      {/* Pain points */}
      <section className="border-y bg-secondary/40">
        <div className="container mx-auto grid gap-6 px-6 py-16 md:grid-cols-2">
          {seo.painPoints.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border bg-card p-6 shadow-card-soft transition-shadow hover:shadow-card-lift"
            >
              <p className="text-sm font-semibold tracking-tight">{p.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sample */}
      <section className="container mx-auto px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            What an AI response looks like
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Tuned for {pack?.name ?? "your industry"}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Sample copy below. Your real responses are drafted in your tone,
            with the caution phrases your industry requires.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
          <Card className="hover-lift">
            <CardHeader>
              <CardTitle className="text-base">
                Review · {seo.sample.reviewer}
              </CardTitle>
              <AnimatedStars rating={seo.sample.rating} size="sm" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                &ldquo;{seo.sample.body}&rdquo;
              </p>
            </CardContent>
          </Card>
          <Card className="ring-brand-glow border-primary/40">
            <CardHeader>
              <CardTitle className="text-base">
                AI draft · your voice
              </CardTitle>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Sample
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">{seo.sample.response}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Plan call-out */}
      <section className="border-y bg-secondary/30">
        <div className="container mx-auto px-6 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {growthPlan.name} is our most popular plan
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {centsToUsd(growthPlan.priceMonthlyCents)}/mo. Includes unlimited
              AI responses, SMS alerts on negative reviews, review-request
              automation, and a competitor snapshot.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" variant="brand">
                <Link href="/signup?plan=growth">Start 14-day trial</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/pricing">See all plans</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          {pack?.name ?? "Industry"} FAQ
        </h2>
        <div className="mx-auto mt-10 max-w-3xl space-y-4">
          {seo.faqs.map(({ q, a }) => (
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

      {/* Cross-link other industries */}
      <section className="border-y bg-secondary/30">
        <div className="container mx-auto px-6 py-14">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-primary">
            Other industries we serve
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {otherIndustries.map((entry) => {
              const otherPack = getIndustryPack(entry.packId);
              return (
                <Link
                  key={entry.slug}
                  href={`/industries/${entry.slug}`}
                  className="rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <span className="mr-1.5" aria-hidden>
                    {otherPack?.emoji ?? "·"}
                  </span>
                  {otherPack?.name ?? entry.slug}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative isolate overflow-hidden border-t bg-brand-navy text-white">
        <BrandGlow intensity="bold" />
        <div className="container relative mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {seo.closingLine}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">
            Two minutes, no credit card. We&apos;ll email a score and a punch
            list of what to fix first.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="brand">
              <Link href="/free-audit">Get free reputation audit</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-white/0 text-white hover:bg-white/10"
            >
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
