import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { InstallAppButton } from "@/components/install-app-button";
import { logout } from "@/app/(auth)/actions";

type Props = {
  orgName: string;
  userEmail: string;
  onboardingIncomplete?: boolean;
};

const LINKS: Array<{ href: string; label: string }> = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inbox", label: "Inbox" },
  { href: "/review-requests", label: "Review Requests" },
  { href: "/locations", label: "Locations" },
  { href: "/settings", label: "Settings" },
  { href: "/billing", label: "Billing" },
];

export function AppNav({
  orgName,
  userEmail,
  onboardingIncomplete = false,
}: Props) {
  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/dashboard" className="shrink-0" aria-label="AutoFiveStar dashboard">
            <Logo markSize={24} wordmarkClassName="text-sm" />
          </Link>
          <span className="hidden truncate text-xs text-muted-foreground lg:inline">
            {orgName}
          </span>
        </div>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:px-3"
            >
              {link.label}
            </Link>
          ))}
          {onboardingIncomplete ? (
            <Link
              href="/onboarding"
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 hover:bg-amber-100"
            >
              Finish setup
            </Link>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <InstallAppButton className="hidden lg:inline-flex" variant="outline" size="sm" />
          <span className="hidden max-w-[14rem] truncate text-xs text-muted-foreground lg:inline">
            {userEmail}
          </span>
          <form action={logout} className="hidden md:block">
            <Button type="submit" variant="ghost" size="sm">
              Log out
            </Button>
          </form>

          {/* Mobile menu */}
          <details className="relative md:hidden">
            <summary
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&::-webkit-details-marker]:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </summary>
            <div className="absolute right-0 top-11 z-40 w-60 rounded-xl border bg-card p-2 shadow-card-lift">
              <p className="truncate px-3 pb-1 pt-2 text-xs text-muted-foreground">
                {orgName}
              </p>
              <nav aria-label="Mobile" className="flex flex-col">
                {LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    {link.label}
                  </Link>
                ))}
                {onboardingIncomplete ? (
                  <Link
                    href="/onboarding"
                    className="rounded-md px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50"
                  >
                    Finish setup
                  </Link>
                ) : null}
              </nav>
              <div className="mt-1 space-y-2 border-t pt-2">
                <InstallAppButton className="w-full justify-center" variant="outline" size="sm" />
                <p className="truncate px-3 text-xs text-muted-foreground">
                  {userEmail}
                </p>
                <form action={logout}>
                  <Button type="submit" variant="ghost" size="sm" className="w-full justify-center">
                    Log out
                  </Button>
                </form>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
