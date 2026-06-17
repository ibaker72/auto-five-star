import { eq } from "drizzle-orm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireOrgContext } from "@/lib/auth/org";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { PLAN_CONFIG } from "@/lib/billing/plans";
import { saveNotificationPrefs } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = { saved?: string };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireOrgContext();
  const me = await db
    .select()
    .from(users)
    .where(eq(users.id, ctx.user.id))
    .limit(1)
    .then((r) => r[0] ?? null);

  const cfg = PLAN_CONFIG[ctx.org.plan];
  const smsAllowed = cfg.smsAlerts;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {searchParams.saved ? (
        <Alert variant="success">
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>
            Notification preferences updated.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>{ctx.org.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Slug: {ctx.org.slug}</p>
          <p>Industry: {ctx.org.industry ?? "Not set"}</p>
          <p>Plan: {cfg.name}</p>
          <p>Your role: {ctx.membership.role}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Decide how AutoFiveStar alerts you when new reviews come in.
            Negative reviews (1–2 stars) are sent immediately; positive reviews
            are batched into digests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveNotificationPrefs} className="space-y-5">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="alerts_email_enabled"
                defaultChecked={me?.alertsEmailEnabled ?? true}
                className="mt-1 h-4 w-4 rounded border-input"
              />
              <div>
                <div className="text-sm font-medium">Email alerts</div>
                <p className="text-xs text-muted-foreground">
                  Sends to {ctx.user.email}.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="alerts_sms_enabled"
                defaultChecked={me?.alertsSmsEnabled ?? false}
                disabled={!smsAllowed}
                className="mt-1 h-4 w-4 rounded border-input"
              />
              <div>
                <div className="text-sm font-medium">
                  SMS alerts for 1–2 star reviews
                  {!smsAllowed ? (
                    <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                      Growth/Pro
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {smsAllowed
                    ? "We text you only for urgent negative reviews."
                    : "Available on Growth and Pro."}
                </p>
              </div>
            </label>

            <div className="space-y-1">
              <Label htmlFor="notification_phone">
                Notification phone (E.164)
              </Label>
              <Input
                id="notification_phone"
                name="notification_phone"
                type="tel"
                inputMode="tel"
                placeholder="+15551234567"
                defaultValue={me?.notificationPhone ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Required to receive SMS alerts. US numbers only for now.
              </p>
            </div>

            <Button type="submit">Save preferences</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand voice & integrations</CardTitle>
          <CardDescription>
            Brand voice tuning, team management, and additional integrations
            ship in later PRs.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
