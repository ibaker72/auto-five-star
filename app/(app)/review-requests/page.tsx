import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { AnimatedStars } from "@/components/ui/animated-stars";
import { requireOrgContext } from "@/lib/auth/org";
import { db } from "@/lib/db/client";
import {
  locations as locationsTable,
  reviewRequestCampaigns,
} from "@/lib/db/schema";
import { PLAN_CONFIG } from "@/lib/billing/plans";
import {
  canImportCsvReviewRequests,
  canSendSmsReviewRequests,
} from "@/lib/billing/entitlements";
import { describeSendEnvironment } from "@/lib/review-requests/send";
import { getReviewRequestTemplate } from "@/lib/review-requests/templates";
import {
  computeReviewRequestAnalytics,
  computeCampaignProgress,
} from "@/lib/analytics/review-requests";
import { ManualForm } from "./manual-form";
import { CsvForm } from "./csv-form";
import { QrPanel } from "./qr-panel";

export const dynamic = "force-dynamic";

export default async function ReviewRequestsPage() {
  const ctx = await requireOrgContext();
  const planCfg = PLAN_CONFIG[ctx.org.plan];

  const [analytics, smsCheck, csvCheck, locations, recentCampaigns] =
    await Promise.all([
      computeReviewRequestAnalytics(ctx.org.id),
      canSendSmsReviewRequests(ctx.org.id),
      canImportCsvReviewRequests(ctx.org.id),
      db
        .select({ id: locationsTable.id, name: locationsTable.name })
        .from(locationsTable)
        .where(eq(locationsTable.orgId, ctx.org.id)),
      db
        .select({
          id: reviewRequestCampaigns.id,
          name: reviewRequestCampaigns.name,
          channel: reviewRequestCampaigns.channel,
          status: reviewRequestCampaigns.status,
          sendMode: reviewRequestCampaigns.sendMode,
          dailyLimit: reviewRequestCampaigns.dailyLimit,
          createdAt: reviewRequestCampaigns.createdAt,
        })
        .from(reviewRequestCampaigns)
        .where(eq(reviewRequestCampaigns.orgId, ctx.org.id))
        .orderBy(desc(reviewRequestCampaigns.createdAt))
        .limit(5),
    ]);

  const campaignProgress = await computeCampaignProgress(
    ctx.org.id,
    recentCampaigns.map((c) => c.id),
  );

  const env = describeSendEnvironment();
  const template = getReviewRequestTemplate(ctx.org.industry);

  const defaultReviewUrl = locations[0]
    ? `https://search.google.com/local/writereview?placeid=${locations[0].id}`
    : "";

  return (
    <div className="space-y-8 animate-brand-rise">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Review Requests</h1>
            <AnimatedStars size="sm" animated rating={5} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask recent happy customers for an honest Google review. {planCfg.name} plan.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="#manual"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-secondary"
          >
            Manual send
          </Link>
          <Link
            href="#csv"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-secondary"
          >
            CSV import
          </Link>
          <Link
            href="#qr"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-secondary"
          >
            QR code
          </Link>
        </div>
      </div>

      <ComplianceNotice />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <MetricCard
          label="Sent"
          value={analytics.sent.toString()}
          tone="primary"
        />
        <MetricCard label="Pending" value={analytics.pending.toString()} />
        <MetricCard
          label="Failed/skipped"
          value={analytics.failed.toString()}
          tone={analytics.failed > 0 ? "warning" : "default"}
        />
        <MetricCard
          label="Clicked"
          value={analytics.clicked.toString()}
          hint="Tracked when wired"
        />
        <MetricCard
          label="Reviewed"
          value={analytics.reviewed.toString()}
          tone="success"
          hint="Confirmed reviews"
        />
        <MetricCard
          label="Last 30d"
          value={analytics.last30Days.toString()}
          hint="Total requests"
        />
      </div>

      <Card id="manual" className="hover-lift">
        <CardHeader>
          <CardTitle>Send a manual review request</CardTitle>
          <CardDescription>
            Send by email, SMS, or both. The customer receives a short note
            with your Google review link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ManualForm
            defaultBusinessName={ctx.org.name}
            defaultTemplate={template.body}
            defaultReviewUrl={defaultReviewUrl}
            locations={locations}
            smsAllowed={smsCheck.ok}
            emailLive={env.emailLive}
            smsLive={env.smsLive}
          />
        </CardContent>
      </Card>

      <Card id="csv" className="hover-lift">
        <CardHeader>
          <CardTitle>Bulk import customers (CSV)</CardTitle>
          <CardDescription>
            Upload up to 500 customers at once. Preview before sending — no
            request goes out until you confirm.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CsvForm
            defaultBusinessName={ctx.org.name}
            defaultTemplate={template.body}
            defaultReviewUrl={defaultReviewUrl}
            locations={locations}
            smsAllowed={smsCheck.ok}
            allowed={csvCheck.ok}
            upgradeReason={csvCheck.reason ?? ""}
          />
        </CardContent>
      </Card>

      <Card id="qr" className="hover-lift">
        <CardHeader>
          <CardTitle>QR code for in-person customers</CardTitle>
          <CardDescription>
            Generate a printable QR. Customers scan, the camera opens your
            Google review page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QrPanel
            defaultUrl={defaultReviewUrl}
            defaultLocationName={locations[0]?.name ?? ctx.org.name}
          />
        </CardContent>
      </Card>

      {recentCampaigns.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent campaigns</CardTitle>
            <CardDescription>
              The last five review-request batches sent from this account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {recentCampaigns.map((c) => {
                const progress = campaignProgress.get(c.id);
                const isScheduled = c.sendMode === "scheduled";
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2"
                  >
                    <div>
                      <p className="flex items-center gap-2 font-medium">
                        {c.name}
                        {isScheduled ? (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                            Drip{c.dailyLimit ? ` · ${c.dailyLimit}/day` : ""}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.channel} · {c.status}
                        {progress
                          ? ` · ${progress.sent} sent / ${progress.pending} pending${progress.failed > 0 ? ` / ${progress.failed} failed` : ""}`
                          : ""}
                      </p>
                      {isScheduled && progress?.nextScheduledAt ? (
                        <p className="text-xs text-muted-foreground">
                          Next send: {progress.nextScheduledAt.toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {c.createdAt.toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ComplianceNotice() {
  return (
    <Alert>
      <AlertTitle>Send only to real, recent customers</AlertTitle>
      <AlertDescription className="space-y-1 text-xs">
        <p>
          Google&apos;s review policy prohibits incentives, review gating
          (&quot;only review if happy&quot;), and fake urgency. We strip
          incentive language by default — please keep your templates honest.
        </p>
        <p>
          SMS sends respect your <code>SMS_LIVE</code> flag and existing
          Twilio safety patterns. Emails respect <code>EMAIL_LIVE</code>.
        </p>
      </AlertDescription>
    </Alert>
  );
}
