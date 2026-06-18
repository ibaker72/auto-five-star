import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { InstallAppButton } from "@/components/install-app-button";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/free-audit", label: "Free Audit" },
  { href: "/contact", label: "Contact" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-14 items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="AutoFiveStar home">
          <Logo markSize={26} wordmarkClassName="text-base" />
        </Link>

        <nav
          aria-label="Primary"
          className="hidden flex-wrap items-center gap-1 md:flex"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <InstallAppButton
            className="hidden lg:inline-flex"
            variant="ghost"
            size="sm"
          />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm" variant="brand">
            <Link href="/free-audit">Start Free Audit</Link>
          </Button>

          {/* Mobile menu — no-JS friendly disclosure */}
          <details className="relative md:hidden">
            <summary
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&::-webkit-details-marker]:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </summary>
            <div className="absolute right-0 top-11 z-40 w-56 rounded-xl border bg-card p-2 shadow-card-lift">
              <nav aria-label="Mobile" className="flex flex-col">
                {LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  className="rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                >
                  Log in
                </Link>
              </nav>
              <div className="mt-1 border-t pt-2">
                <InstallAppButton className="w-full justify-center" variant="outline" size="sm" />
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
