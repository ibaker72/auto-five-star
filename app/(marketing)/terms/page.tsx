import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of AutoFiveStar's review management software and services.",
  alternates: { canonical: "https://www.autofivestar.com/terms" },
};

const UPDATED = "June 20, 2026";
const SUPPORT = "support@autofivestar.com";

export default function TermsPage() {
  return (
    <section className="container mx-auto px-6 pt-16 pb-16 md:pt-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated {UPDATED}
        </p>

        <div className="prose-legal mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              1. Agreement
            </h2>
            <p className="mt-2">
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to
              and use of AutoFiveStar (the &ldquo;Service&rdquo;), operated by
              AutoFiveStar. By creating an account or using the Service, you
              agree to these Terms. If you do not agree, do not use the Service.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              2. What AutoFiveStar does
            </h2>
            <p className="mt-2">
              AutoFiveStar helps local businesses monitor reviews, draft replies
              in their brand voice, request reviews from customers, and track
              review-growth progress. AI-generated reply drafts are suggestions
              only. Nothing is posted to Google or any other platform until you
              review and approve it. You remain responsible for the content you
              choose to publish.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              3. No guarantees
            </h2>
            <p className="mt-2">
              We help you respond to and request reviews professionally and
              consistently. We do{" "}
              <strong className="text-foreground">not</strong> guarantee any
              specific ratings, search rankings, review volume, or revenue.
              Results depend on factors outside our control, including your
              customers, your business, and third-party platform policies.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              4. Acceptable use
            </h2>
            <p className="mt-2">
              You agree not to use the Service to post fake, incentivized, or
              deceptive reviews, to violate the terms or policies of Google or
              any other platform, or to break any applicable law. You are
              responsible for obtaining any consent required to contact your
              customers by email or SMS.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              5. Accounts and billing
            </h2>
            <p className="mt-2">
              Paid plans are billed in advance on a monthly or annual basis.
              Free trials convert to paid plans unless cancelled before the
              trial ends. You can upgrade, downgrade, or cancel at any time from
              your billing portal; cancellation stops future charges and takes
              effect at the end of the current billing period. Except where
              required by law, fees already paid are non-refundable.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              6. Third-party services
            </h2>
            <p className="mt-2">
              The Service connects to third-party platforms such as Google
              Business Profile through their official APIs and only with the
              access you authorize. AutoFiveStar is not affiliated with,
              endorsed by, or a partner of Google. Your use of those platforms
              is governed by their own terms.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              7. Disclaimers and liability
            </h2>
            <p className="mt-2">
              The Service is provided &ldquo;as is&rdquo; without warranties of
              any kind. To the maximum extent permitted by law, AutoFiveStar is
              not liable for any indirect, incidental, or consequential damages,
              and our total liability is limited to the amount you paid us in the
              twelve months before the claim.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              8. Changes and contact
            </h2>
            <p className="mt-2">
              We may update these Terms from time to time. Material changes will
              be reflected by the &ldquo;last updated&rdquo; date above.
              Questions? Email{" "}
              <a
                href={`mailto:${SUPPORT}`}
                className="font-medium text-primary underline"
              >
                {SUPPORT}
              </a>
              .
            </p>
          </div>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          See also our{" "}
          <Link href="/privacy" className="font-medium text-primary underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
