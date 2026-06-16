import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { bootstrapUserOrg } from "@/lib/auth/bootstrap";
import { getCurrentUserPrimaryOrg } from "@/lib/auth/org";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user?.email) redirect("/login");

  // Idempotent: if bootstrap already ran, this just returns the org.
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  await bootstrapUserOrg({
    userId: user.id,
    email: user.email,
    fullName: typeof meta.full_name === "string" ? meta.full_name : null,
    avatarUrl: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
  });

  const primary = await getCurrentUserPrimaryOrg(user.id);
  if (!primary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>We hit a snag</CardTitle>
          <CardDescription>
            Your account is set up but we could not load your workspace.
            Try refreshing, or contact support@autofivestar.com.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Step 1 of 4
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Welcome to {primary.org.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your 14-day free trial is active. Next we'll connect your Google
          Business Profile and pull your reviews.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What's set up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>· Workspace created</p>
          <p>· Owner membership assigned to {user.email}</p>
          <p>· Default brand voice (you can tune this later)</p>
          <p>· Usage tracker initialized</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coming next</CardTitle>
          <CardDescription>
            Industry pack, Google Business Profile connection, tone tuning,
            and your first AI drafts. PR #4 lights this up.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/billing">View plans</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
