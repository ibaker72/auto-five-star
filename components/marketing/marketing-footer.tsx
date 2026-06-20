import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { InstallAppButton } from "@/components/install-app-button";

export function MarketingFooter() {
  return (
    <footer className="mt-16 border-t bg-gradient-to-b from-background to-secondary/30">
      <div className="container mx-auto grid gap-8 px-6 py-12 text-sm text-muted-foreground sm:grid-cols-2 md:grid-cols-4">
        <div>
          <Logo markSize={26} wordmarkClassName="text-sm" />
          <p className="mt-3 max-w-xs">
            AI review replies and review-request automation for local
            businesses. Never leave a Google review unanswered.
          </p>
          <InstallAppButton
            className="mt-4"
            variant="outline"
            size="sm"
            label="Download App"
            hideWhenInstalled={false}
          />
        </div>
        <div>
          <p className="font-medium text-foreground">Product</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/features" className="hover:text-foreground">
                Features
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-foreground">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/free-audit" className="hover:text-foreground">
                Free Audit
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-foreground">Company</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/contact" className="hover:text-foreground">
                Contact
              </Link>
            </li>
            <li>
              <a
                href="mailto:support@autofivestar.com"
                className="hover:text-foreground"
              >
                support@autofivestar.com
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-foreground">Sign up</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/signup" className="hover:text-foreground">
                Start free trial
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-foreground">
                Log in
              </Link>
            </li>
          </ul>
          <p className="mt-4 font-medium text-foreground">Legal</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t bg-background">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} AutoFiveStar. Powered by{" "}
            <a
              href="https://www.tweakandbuild.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground/80 underline-offset-2 hover:text-primary hover:underline"
            >
              Tweak &amp; Build
            </a>
            .
          </p>
          <p className="max-w-md text-right">
            We help local businesses respond to and request reviews
            professionally. We do not guarantee ratings, rankings, or revenue.
          </p>
        </div>
      </div>
    </footer>
  );
}
