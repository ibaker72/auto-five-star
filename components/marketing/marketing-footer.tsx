import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="mt-16 border-t">
      <div className="container mx-auto grid gap-8 px-6 py-10 text-sm text-muted-foreground sm:grid-cols-2 md:grid-cols-4">
        <div>
          <p className="text-sm font-bold tracking-tight text-foreground">
            AutoFiveStar
          </p>
          <p className="mt-2 max-w-xs">
            AI review replies for local businesses. Never leave a Google review
            unanswered.
          </p>
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
        </div>
      </div>
      <div className="border-t">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} AutoFiveStar.</p>
          <p>
            We help local businesses respond to reviews professionally. We do
            not guarantee ratings, rankings, or revenue.
          </p>
        </div>
      </div>
    </footer>
  );
}
