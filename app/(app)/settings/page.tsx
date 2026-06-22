import Link from "next/link";
import { eq } from "drizzle-orm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireOrgContext } from "@/lib/auth/org";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { PLAN_CONFIG } from "@/lib/billing/plans";
import {
  getBrandVoiceForOrg,
  RESPONSE_LENGTHS,
  TONE_PRESETS,
} from "@/lib/ai/brand-voice";
import {
  getIndustryPack,
  listIndustryPacks,
} from "@/lib/templates/industry-packs";
import { cn } from "@/lib/utils";
import { describeSendEnvironment } from "@/lib/review-requests/send";
import { InstallAppButton } from "@/components/install-app-button";
import {
  saveBrandVoice,
  saveIndustry,
  saveNotificationPrefs,
} from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = { saved?: string };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireOrgContext();
  const [me, voice] = await Promise.all([
    db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1)
      .then((r) => r[0] ?? null),
    getBrandVoiceForOrg(ctx.org.id),
  ]);

  const cfg = PLAN_CONFIG[ctx.org.plan];
  const smsAllowed = cfg.smsAlerts;
  const { smsLive } = describeSendEnvironment();
  const pack = getIndustryPack(ctx.org.industry);
  const packs = listIndustryPacks();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {searchParams.saved ? (
        <Alert variant="success">
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>Settings updated.</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>{ctx.org.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Slug: {ctx.org.slug}</p>
          <p>Industry: {pack ? `${pack.emoji} ${pack.name}` : "Not set"}</p>
          <p>Plan: {cfg.name}</p>
          <p>Your role: {ctx.membership.role}</p>
          <p>
            Onboarding:{" "}
            {ctx.org.onboardingCompletedAt ? (
              <span className="text-emerald-600">
                Complete (
                {ctx.org.onboardingCompletedAt.toLocaleDateString()})
              </span>
            ) : (
              <>
                <span className="text-rose-600">Incomplete</span>{" "}
                <Link href="/onboarding" className="underline">
                  Finish setup →
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Install the app</CardTitle>
          <CardDescription>
            Add AutoFiveStar to your desktop or phone home screen for one-tap
            access and a full-screen, app-like experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstallAppButton
            variant="brand"
            size="default"
            label="Install AutoFiveStar"
            hideWhenInstalled={false}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            On iPhone, open in Safari and tap Share → Add to Home Screen. On
            Android or desktop Chrome, use the install icon in the address bar or
            browser menu.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Industry pack</CardTitle>
          <CardDescription>
            Seeds your brand voice with sensible defaults and tells the AI
            which claims to avoid for your vertical.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveIndustry} className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {packs.map((p) => (
                <label
                  key={p.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm hover:bg-secondary/40",
                    ctx.org.industry === p.id && "border-primary bg-primary/5",
                  )}
                >
                  <input
                    type="radio"
                    name="industry"
                    value={p.id}
                    defaultChecked={ctx.org.industry === p.id}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">
                      {p.emoji} {p.name}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.shortDescription}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <Button type="submit" variant="outline">
              Save industry
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand voice</CardTitle>
          <CardDescription>
            How AI drafts should sound. All fields are optional — defaults
            fall back to the industry pack.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveBrandVoice} className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Tone preset</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {TONE_PRESETS.map((p) => {
                  const checked =
                    (voice?.tonePreset ?? pack?.defaultTonePreset) === p.id;
                  return (
                    <label
                      key={p.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm hover:bg-secondary/40",
                        checked && "border-primary",
                      )}
                    >
                      <input
                        type="radio"
                        name="tone_preset"
                        value={p.id}
                        defaultChecked={checked}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">{p.label}</div>
                        <p className="text-xs text-muted-foreground">
                          {p.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Response length</legend>
              <div className="flex flex-wrap gap-2">
                {RESPONSE_LENGTHS.map((l) => {
                  const checked =
                    (voice?.responseLength ?? pack?.defaultResponseLength) ===
                    l.id;
                  return (
                    <label
                      key={l.id}
                      className={cn(
                        "cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-secondary/40",
                        checked && "border-primary bg-primary/5",
                      )}
                    >
                      <input
                        type="radio"
                        name="response_length"
                        value={l.id}
                        defaultChecked={checked}
                        className="sr-only"
                      />
                      {l.label}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({l.description})
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="emoji_allowed"
                defaultChecked={
                  voice?.emojiAllowed ?? pack?.defaultEmojiAllowed ?? false
                }
                className="mt-1 h-4 w-4 rounded border-input"
              />
              <div>
                <div className="text-sm font-medium">Allow emojis</div>
                <p className="text-xs text-muted-foreground">
                  Used sparingly and only when they fit naturally.
                </p>
              </div>
            </label>

            <div className="space-y-1">
              <Label htmlFor="signature">Signature</Label>
              <Input
                id="signature"
                name="signature"
                defaultValue={voice?.voiceSignature ?? ""}
                placeholder='e.g. "— The Smith Family"'
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="custom_notes">Voice notes</Label>
              <Textarea
                id="custom_notes"
                name="custom_notes"
                defaultValue={voice?.customNotes ?? ""}
                rows={4}
                placeholder="What should the AI always do or avoid?"
              />
            </div>

            <Button type="submit">Save brand voice</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Decide how AutoFiveStar alerts you when new reviews come in.
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
                    ? smsLive
                      ? "We text you only for urgent negative reviews."
                      : "We text you only for urgent negative reviews. Texts begin once your messaging number is approved — until then we'll keep alerting you by email."
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
              {smsAllowed && me?.alertsSmsEnabled && !me.notificationPhone ? (
                <p className="text-xs text-rose-600">
                  SMS alerts are enabled but no phone number is set — alerts
                  will be skipped until you add one.
                </p>
              ) : null}
            </div>

            <Button type="submit">Save preferences</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
