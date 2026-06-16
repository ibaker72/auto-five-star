import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgContext } from "@/lib/auth/org";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requireOrgContext();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>{ctx.org.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Slug: {ctx.org.slug}</p>
          <p>Industry: {ctx.org.industry ?? "Not set"}</p>
          <p>Plan: {ctx.org.plan}</p>
          <p>Your role: {ctx.membership.role}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Brand voice & integrations</CardTitle>
          <CardDescription>
            Brand voice tuning, Google Business Profile, and team management
            ship in later PRs.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
