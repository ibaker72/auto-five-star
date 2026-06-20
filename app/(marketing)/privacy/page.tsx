import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How AutoFiveStar collects, uses, and protects your information.",
  alternates: { canonical: "https://www.autofivestar.com/privacy" },
};

const UPDATED = "June 20, 2026";
const SUPPORT = "support@autofivestar.com";

export default function PrivacyPage() {
  return (
    <section className="container mx-auto px-6 pt-16 pb-16 md:pt-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated {UPDATED}
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              1. Information we collect
            </h2>
            <p className="mt-2">
              We collect information you provide directly — such as your name,
              business name, email address, phone number, and the details you
              enter when you request a free audit or create an account. When you
              connect a third-party platform like Google Business Profile, we
              access the review data you authorize. We also collect basic usage
              and device data to operate and improve the Service.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              2. How we use information
            </h2>
            <p className="mt-2">
              We use your information to generate your reputation audit, provide
              and improve the Service, send you your audit report and product
              communications, respond to support requests, and keep the Service
              secure. We do not sell your personal information.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              3. Email and SMS
            </h2>
            <p className="mt-2">
              If you run a free audit, we email the report to the address you
              provide. If you enable review-request automation, messages are
              sent only to recipients you add, and you are responsible for having
              permission to contact them. You can opt out of marketing emails at
              any time using the unsubscribe link or by emailing us.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              4. Service providers
            </h2>
            <p className="mt-2">
              We share information with vendors who help us run the Service —
              including hosting, database, email delivery, payment processing,
              and analytics providers — only as needed to provide the Service and
              under appropriate confidentiality obligations.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              5. Data retention and security
            </h2>
            <p className="mt-2">
              We retain your information for as long as your account is active or
              as needed to provide the Service and meet legal obligations. We use
              reasonable technical and organizational measures to protect your
              data, though no method of transmission or storage is completely
              secure.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              6. Your choices
            </h2>
            <p className="mt-2">
              You can access, update, or delete your account information, or
              request a copy of your data, by emailing us. You can disconnect any
              connected platform at any time from your settings.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              7. Contact
            </h2>
            <p className="mt-2">
              Questions about this policy? Email{" "}
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
          <Link href="/terms" className="font-medium text-primary underline">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
