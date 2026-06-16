import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/(auth)/actions";

type Props = {
  orgName: string;
  userEmail: string;
};

const LINKS: Array<{ href: string; label: string }> = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inbox", label: "Inbox" },
  { href: "/locations", label: "Locations" },
  { href: "/settings", label: "Settings" },
  { href: "/billing", label: "Billing" },
];

export function AppNav({ orgName, userEmail }: Props) {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto flex h-14 items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-bold tracking-tight">
            AutoFiveStar
          </Link>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {orgName}
          </span>
        </div>
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {userEmail}
          </span>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Log out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
