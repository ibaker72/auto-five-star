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
  getCampaignAnalytics,
} from "@/lib/analytics/review-requests";
import {
  formatPct,
  roiSummaryText,
  type CampaignMetrics,
} from "@/lib/analytics/campaign-analytics";
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

  const campaignAnalytics = await getCampaignAnalytics(
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
            <CardTitle>Campaign performance</CardTitle>
            <CardDescription>
              How your last five review-request campaigns are converting —
              sends, clicks, and attributed reviews.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCampaigns.map((c) => (
                <CampaignPerformanceRow
                  key={c.id}
                  name={c.name}
                  channel={c.channel}
                  status={c.status}
                  sendMode={c.sendMode}
                  dailyLimit={c.dailyLimit}
                  createdAt={c.createdAt}
                  metrics={campaignAnalytics.get(c.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StatChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "success";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "warning"
        ? "text-amber-700"
        : "text-foreground";
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`text-lg font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

function CampaignPerformanceRow({
  name,
  channel,
  status,
  sendMode,
  dailyLimit,
  createdAt,
  metrics,
}: {
  name: string;
  channel: string;
  status: string;
  sendMode: string;
  dailyLimit: number | null;
  createdAt: Date;
  metrics?: CampaignMetrics;
}) {
  const m = metrics;
  const isScheduled = sendMode === "scheduled";
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 font-medium">
            {name}
            {isScheduled ? (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                Drip{dailyLimit ? ` · ${dailyLimit}/day` : ""}
              </span>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {channel} · {status}
            {m?.lastSentAt ? ` · last sent ${m.lastSentAt.toLocaleDateString()}` : ""}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {createdAt.toLocaleDateString()}
        </span>
      </div>

      {m ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <StatChip label="Recipients" value={m.total.toString()} />
            <StatChip label="Sent" value={m.sent.toString()} />
            <StatChip
              label="Pending"
              value={m.pending.toString()}
              tone={m.pending > 0 ? "warning" : "default"}
            />
            <StatChip
              label="Failed"
              value={(m.failed + m.skipped).toString()}
              tone={m.failed + m.skipped > 0 ? "warning" : "default"}
            />
            <StatChip label="Clicked" value={m.clicked.toString()} />
            <StatChip
              label="Reviews"
              value={m.reviews.toString()}
              tone={m.reviews > 0 ? "success" : "default"}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>
              Click-through:{" "}
              <strong className="text-foreground">
                {formatPct(m.clickThroughRate)}
              </strong>
            </span>
            <span>
              Review conversion:{" "}
              <strong className="text-foreground">
                {formatPct(m.reviewConversionRate)}
              </strong>
            </span>
            {isScheduled && m.nextScheduledAt ? (
              <span>
                Next send:{" "}
                <strong className="text-foreground">
                  {m.nextScheduledAt.toLocaleString()}
                </strong>
              </span>
            ) : null}
          </div>

          <p className="mt-3 rounded-md bg-secondary/40 px-3 py-2 text-sm">
            {roiSummaryText(m)}
          </p>
        </>
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
