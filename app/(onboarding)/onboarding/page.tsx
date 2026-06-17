import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { bootstrapUserOrg } from "@/lib/auth/bootstrap";
import { getCurrentUserPrimaryOrg } from "@/lib/auth/org";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getGoogleConnectionStatus } from "@/lib/integrations/google-tokens";
import {
  getBrandVoiceForOrg,
  RESPONSE_LENGTHS,
  TONE_PRESETS,
} from "@/lib/ai/brand-voice";
import {
  isOnboardingStep,
  ONBOARDING_STEPS,
  STEP_TITLES,
  stepProgress,
  type OnboardingStep,
} from "@/lib/onboarding/steps";
import {
  getIndustryPack,
  listIndustryPacks,
} from "@/lib/templates/industry-packs";
import { PLAN_CONFIG } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import {
  saveBusinessStep,
  saveIndustryStep,
  saveNotificationsStep,
  saveVoiceStep,
  skipToStep,
} from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = { step?: string; error?: string };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user?.email) redirect("/login");

  // Idempotent bootstrap, then load context.
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
            Try refreshing, or contact support@autofivestar.com.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (primary.org.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  const step: OnboardingStep = isOnboardingStep(searchParams.step)
    ? searchParams.step
    : (primary.org.onboardingStep as OnboardingStep | null) ?? "welcome";

  const { index, total } = stepProgress(step);

  const [me, voice, googleStatus] = await Promise.all([
    db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)
      .then((r) => r[0] ?? null),
    getBrandVoiceForOrg(primary.org.id),
    getGoogleConnectionStatus(primary.org.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Step {Math.max(index + 1, 1)} of {total}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {STEP_TITLES[step]}
        </h1>
      </div>

      <ProgressBar current={step} />

      {searchParams.error ? (
        <Alert variant="destructive">
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>{searchParams.error}</AlertDescription>
        </Alert>
      ) : null}

      {step === "welcome" ? <WelcomeStep /> : null}
      {step === "business" ? (
        <BusinessStep
          orgName={primary.org.name}
          userEmail={user.email}
        />
      ) : null}
      {step === "industry" ? (
        <IndustryStep currentIndustry={primary.org.industry ?? null} />
      ) : null}
      {step === "google" ? (
        <GoogleStep
          connected={googleStatus.connected}
          accountEmail={googleStatus.accountEmail}
        />
      ) : null}
      {step === "notifications" ? (
        <NotificationsStep
          alertsEmailEnabled={me?.alertsEmailEnabled ?? true}
          alertsSmsEnabled={me?.alertsSmsEnabled ?? false}
          notificationPhone={me?.notificationPhone ?? ""}
          smsAllowed={PLAN_CONFIG[primary.org.plan].smsAlerts}
        />
      ) : null}
      {step === "voice" ? (
        <VoiceStep
          tonePreset={voice?.tonePreset ?? null}
          responseLength={voice?.responseLength ?? null}
          emojiAllowed={voice?.emojiAllowed ?? false}
          signature={voice?.voiceSignature ?? ""}
          customNotes={voice?.customNotes ?? ""}
          industry={primary.org.industry ?? null}
        />
      ) : null}
    </div>
  );
}

function ProgressBar({ current }: { current: OnboardingStep }) {
  return (
    <ol className="flex flex-wrap gap-2 text-xs">
      {ONBOARDING_STEPS.filter((s) => s !== "done").map((s, i) => {
        const isCurrent = s === current;
        const idx = ONBOARDING_STEPS.indexOf(s);
        const currentIdx = ONBOARDING_STEPS.indexOf(current);
        const isDone = idx < currentIdx;
        return (
          <li
            key={s}
            className={cn(
              "rounded-md border px-2 py-1",
              isCurrent && "border-primary bg-primary text-primary-foreground",
              !isCurrent &&
                isDone &&
                "border-emerald-200 bg-emerald-50 text-emerald-700",
              !isCurrent && !isDone && "text-muted-foreground",
            )}
          >
            {i + 1}. {STEP_TITLES[s]}
          </li>
        );
      })}
    </ol>
  );
}

function WelcomeStep() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Let's get you set up</CardTitle>
        <CardDescription>
          We'll spend a couple of minutes on your business, industry, Google
          connection, alerts, and brand voice. You can change all of this later
          in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <form action={skipToStep}>
          <input type="hidden" name="target" value="business" />
          <Button type="submit">Start setup</Button>
        </form>
        <form action={skipToStep}>
          <input type="hidden" name="target" value="done" />
          <Button type="submit" variant="ghost">
            Skip for now
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function BusinessStep({
  orgName,
  userEmail,
}: {
  orgName: string;
  userEmail: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business profile</CardTitle>
        <CardDescription>
          What name should we use across the app and your review replies?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={saveBusinessStep} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Business name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={orgName}
              placeholder="Your business name"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Logged in as {userEmail}.
          </p>
          <div className="flex gap-2">
            <Button type="submit">Continue</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function IndustryStep({ currentIndustry }: { currentIndustry: string | null }) {
  const packs = listIndustryPacks();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pick your industry</CardTitle>
        <CardDescription>
          We'll preload a starting brand voice, caution phrases, and alert
          recommendations for your vertical. You can override anything later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={saveIndustryStep} className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {packs.map((pack) => (
              <label
                key={pack.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-secondary/40",
                  currentIndustry === pack.id && "border-primary bg-primary/5",
                )}
              >
                <input
                  type="radio"
                  name="industry"
                  value={pack.id}
                  defaultChecked={currentIndustry === pack.id}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium">
                    {pack.emoji} {pack.name}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pack.shortDescription}
                  </p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="submit">Continue</Button>
            <form action={skipToStep}>
              <input type="hidden" name="target" value="google" />
              <Button type="submit" variant="ghost">
                Skip
              </Button>
            </form>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function GoogleStep({
  connected,
  accountEmail,
}: {
  connected: boolean;
  accountEmail: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect Google Business Profile</CardTitle>
        <CardDescription>
          Pull your reviews and post replies in seconds. We never post without
          your approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connected ? (
          <Alert variant="success">
            <AlertTitle>Connected</AlertTitle>
            <AlertDescription>
              {accountEmail
                ? `Connected as ${accountEmail}.`
                : "Google Business Profile is connected."}{" "}
              <Link href="/locations" className="underline">
                Manage locations →
              </Link>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Head over to Locations to connect Google. It opens a new
              browser flow and brings you back here.
            </p>
            <Button asChild>
              <Link href="/locations">Open Locations</Link>
            </Button>
          </>
        )}
        <div className="flex gap-2 pt-2">
          <form action={skipToStep}>
            <input type="hidden" name="target" value="notifications" />
            <Button type="submit">Continue</Button>
          </form>
          <form action={skipToStep}>
            <input type="hidden" name="target" value="notifications" />
            <Button type="submit" variant="ghost">
              Skip for now
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsStep({
  alertsEmailEnabled,
  alertsSmsEnabled,
  notificationPhone,
  smsAllowed,
}: {
  alertsEmailEnabled: boolean;
  alertsSmsEnabled: boolean;
  notificationPhone: string;
  smsAllowed: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>When should we alert you?</CardTitle>
        <CardDescription>
          Negative reviews (1-2 stars) are sent immediately. Positive reviews
          go into digests so they don't pile up.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={saveNotificationsStep} className="space-y-5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="alerts_email_enabled"
              defaultChecked={alertsEmailEnabled}
              className="mt-1 h-4 w-4 rounded border-input"
            />
            <div>
              <div className="text-sm font-medium">Email alerts</div>
              <p className="text-xs text-muted-foreground">
                We'll email you the moment a 1-2 star review lands.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="alerts_sms_enabled"
              defaultChecked={alertsSmsEnabled}
              disabled={!smsAllowed}
              className="mt-1 h-4 w-4 rounded border-input"
            />
            <div>
              <div className="text-sm font-medium">
                SMS alerts on 1-2 star reviews
                {!smsAllowed ? (
                  <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                    Growth/Pro
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {smsAllowed
                  ? "We'll only text you for urgent negative reviews."
                  : "SMS alerts are available on Growth and Pro plans."}
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
              defaultValue={notificationPhone}
            />
            <p className="text-xs text-muted-foreground">
              Required to receive SMS alerts. US numbers only for now.
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="submit">Continue</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function VoiceStep({
  tonePreset,
  responseLength,
  emojiAllowed,
  signature,
  customNotes,
  industry,
}: {
  tonePreset: string | null;
  responseLength: string | null;
  emojiAllowed: boolean;
  signature: string;
  customNotes: string;
  industry: string | null;
}) {
  const pack = getIndustryPack(industry);
  const seededTone = tonePreset ?? pack?.defaultTonePreset ?? "professional";
  const seededLength =
    responseLength ?? pack?.defaultResponseLength ?? "medium";
  const seededEmoji = emojiAllowed || (pack?.defaultEmojiAllowed ?? false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand voice</CardTitle>
        <CardDescription>
          {pack
            ? `We seeded these from the ${pack.name} pack. Tweak as you like.`
            : "Pick how your replies should sound. You can change this later."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={saveVoiceStep} className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tone preset</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {TONE_PRESETS.map((p) => (
                <label
                  key={p.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm hover:bg-secondary/40",
                    seededTone === p.id && "border-primary",
                  )}
                >
                  <input
                    type="radio"
                    name="tone_preset"
                    value={p.id}
                    defaultChecked={seededTone === p.id}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{p.label}</div>
                    <p className="text-xs text-muted-foreground">
                      {p.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Response length</legend>
            <div className="flex flex-wrap gap-2">
              {RESPONSE_LENGTHS.map((l) => (
                <label
                  key={l.id}
                  className={cn(
                    "cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-secondary/40",
                    seededLength === l.id && "border-primary bg-primary/5",
                  )}
                >
                  <input
                    type="radio"
                    name="response_length"
                    value={l.id}
                    defaultChecked={seededLength === l.id}
                    className="sr-only"
                  />
                  {l.label}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({l.description})
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="emoji_allowed"
              defaultChecked={seededEmoji}
              className="mt-1 h-4 w-4 rounded border-input"
            />
            <div>
              <div className="text-sm font-medium">Allow emojis</div>
              <p className="text-xs text-muted-foreground">
                We'll only use them when they fit naturally.
              </p>
            </div>
          </label>

          <div className="space-y-1">
            <Label htmlFor="signature">Signature (optional)</Label>
            <Input
              id="signature"
              name="signature"
              defaultValue={signature}
              placeholder='e.g. "— The Smith Family"'
            />
            <p className="text-xs text-muted-foreground">
              We'll add this to the end of each reply.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="custom_notes">Voice notes (optional)</Label>
            <Textarea
              id="custom_notes"
              name="custom_notes"
              defaultValue={customNotes}
              placeholder='e.g. "Always offer to call back at our office number, but never quote a price online."'
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit">Finish setup</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
