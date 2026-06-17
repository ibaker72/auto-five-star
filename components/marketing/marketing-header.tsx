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
      <div className="container mx-auto flex h-14 items-center justify-between gap-6 px-6">
        <Link href="/" className="text-base font-bold tracking-tight">
          AutoFiveStar
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
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
        <div className="flex items-center gap-2">
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
