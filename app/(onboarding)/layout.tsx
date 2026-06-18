import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  clearServerSession,
  getAuthenticatedUser,
} from "@/lib/auth/supabase-server";
import { logout } from "@/app/(auth)/actions";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, error } = await getAuthenticatedUser();
  if (error) {
    await clearServerSession();
    redirect("/login?reason=session-expired");
  }
  if (!user?.email) redirect("/login?reason=session-expired");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-14 items-center justify-between px-6">
          <Link href="/" className="text-sm font-bold tracking-tight">
            AutoFiveStar
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user.email}
            </span>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="container mx-auto max-w-2xl px-6 py-12">{children}</div>
    </div>
  );
}
