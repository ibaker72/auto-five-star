import Link from "next/link";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/free-audit", label: "Free Audit" },
  { href: "/contact", label: "Contact" },
];

export function MarketingHeader() {
  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-30">
      <div className="container mx-auto flex h-14 items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-base font-bold tracking-tight"
        >
          AutoFiveStar
        </Link>
        <nav
          aria-label="Primary"
          className="hidden flex-wrap items-center gap-1 md:flex"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/free-audit">Start Free Audit</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
