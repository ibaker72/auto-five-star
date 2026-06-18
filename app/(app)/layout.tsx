import { redirect } from "next/navigation";
import { AppNav } from "@/components/nav/app-nav";
import {
  clearServerSession,
  getAuthenticatedUser,
} from "@/lib/auth/supabase-server";
import { getCurrentUserPrimaryOrg } from "@/lib/auth/org";
import { bootstrapUserOrg } from "@/lib/auth/bootstrap";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, error } = await getAuthenticatedUser();

  // Broken/stale session (e.g. an expired or already-rotated refresh token):
  // clear the bad cookies so the next request starts clean, then send to login.
  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "[app/layout] auth error, clearing session:",
        error.message,
      );
    }
    await clearServerSession();
    redirect("/login?reason=session-expired");
  }

  if (!user?.email) {
    redirect("/login?reason=session-expired");
  }

  let primary = await getCurrentUserPrimaryOrg(user.id);
  if (!primary) {
    // Self-heal: a user who confirmed email but missed bootstrap (or who
    // signed in via a stale session) should not get stuck. Bootstrap here.
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    try {
      await bootstrapUserOrg({
        userId: user.id,
        email: user.email,
        fullName: typeof meta.full_name === "string" ? meta.full_name : null,
        avatarUrl: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
      });
      primary = await getCurrentUserPrimaryOrg(user.id);
    } catch (err) {
      console.error("[app/layout] bootstrap failed", err);
      redirect("/onboarding");
    }
  }
  if (!primary) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-background">
      <AppNav
        orgName={primary.org.name}
        userEmail={user.email}
        onboardingIncomplete={!primary.org.onboardingCompletedAt}
      />
      <div className="container mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
