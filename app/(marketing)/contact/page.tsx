import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Talk to the AutoFiveStar team about a demo, your account, or sales.",
  alternates: { canonical: "https://www.autofivestar.com/contact" },
};

const SUPPORT = "support@autofivestar.com";

type SearchParams = { topic?: string };

export default async function ContactPage({
  searchParams,
}: {
  // Next.js 16: searchParams is async and must be awaited.
  searchParams: Promise<SearchParams>;
}) {
  const { topic = "general" } = await searchParams;
  return (
    <section className="container mx-auto px-6 pt-16 pb-16 md:pt-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          {topic === "demo"
            ? "Book a demo"
            : topic === "sales"
              ? "Talk to sales"
              : "Talk to us"}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          The fastest way to reach us is email. We answer within one business
          day.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Email</CardTitle>
            <CardDescription>
              Best for: general questions, demos, sales, support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={`mailto:${SUPPORT}?subject=${encodeURIComponent(
                topic === "demo"
                  ? "Demo request"
                  : topic === "sales"
                    ? "Sales question"
                    : "AutoFiveStar question",
              )}`}
              className="text-base font-medium text-primary underline"
            >
              {SUPPORT}
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Have a free audit first?</CardTitle>
            <CardDescription>
              Most teams find a 5-minute audit answers their first three
              questions for them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href="/free-audit"
              className="text-base font-medium text-primary underline"
            >
              Run the free audit →
            </a>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
