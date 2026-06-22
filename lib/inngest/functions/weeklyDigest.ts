import { and, eq, gte, lte, desc, sql } from "drizzle-orm";
import { inngest } from "../client";
import { db } from "@/lib/db/client";
import {
  organizations,
  orgMembers,
  reviews,
  users,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/integrations/resend";
import { PLAN_CONFIG } from "@/lib/billing/plans";

export const weeklyDigest = inngest.createFunction(
  {
    id: "weekly-review-digest",
    triggers: { cron: "0 9 * * 1" },
  },
  async ({ step }) => {
    const orgs = await step.run("collect-orgs", async () => {
      const rows = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          plan: organizations.plan,
        })
        .from(organizations);
      return rows;
    });

    let sent = 0;
    let skipped = 0;

    for (const org of orgs) {
      const cfg = PLAN_CONFIG[org.plan as keyof typeof PLAN_CONFIG];
      if (!cfg) {
        skipped++;
        continue;
      }

      await step.run(`digest-${org.id}`, async () => {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const weeklyReviews = await db
          .select({
            rating: reviews.rating,
            reviewerName: reviews.reviewerName,
            body: reviews.body,
            postedAt: reviews.postedAt,
            status: reviews.status,
          })
          .from(reviews)
          .where(
            and(
              eq(reviews.orgId, org.id),
              gte(reviews.postedAt, weekAgo),
            ),
          )
          .orderBy(desc(reviews.postedAt))
          .limit(20);

        if (weeklyReviews.length === 0) {
          skipped++;
          return;
        }

        const stats = {
          total: weeklyReviews.length,
          avgRating:
            weeklyReviews.reduce((s, r) => s + r.rating, 0) /
            weeklyReviews.length,
          fiveStar: weeklyReviews.filter((r) => r.rating === 5).length,
          negative: weeklyReviews.filter((r) => r.rating <= 2).length,
          needsReply: weeklyReviews.filter(
            (r) => r.status === "new" || r.status === "drafted",
          ).length,
        };

        const members = await db
          .select({ email: users.email, fullName: users.fullName })
          .from(orgMembers)
          .innerJoin(users, eq(users.id, orgMembers.userId))
          .where(eq(orgMembers.orgId, org.id));

        for (const member of members) {
          const alertPrefs = await db
            .select({ alertsEmailEnabled: users.alertsEmailEnabled })
            .from(users)
            .where(eq(users.email, member.email))
            .limit(1);

          if (alertPrefs[0] && !alertPrefs[0].alertsEmailEnabled) continue;

          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ?? "https://www.autofivestar.com";

          await sendEmail({
            to: member.email,
            subject: `Weekly review digest — ${org.name} (${stats.total} new)`,
            html: buildDigestHtml({
              recipientName: member.fullName,
              businessName: org.name,
              stats,
              reviews: weeklyReviews.slice(0, 5),
              appUrl,
            }),
            text: `${org.name}: ${stats.total} reviews this week (avg ${stats.avgRating.toFixed(1)}). ${stats.needsReply} need a reply. View: ${appUrl}/inbox`,
          });
          sent++;
        }
      });
    }

    return { sent, skipped, orgs: orgs.length };
  },
);

function buildDigestHtml(args: {
  recipientName: string | null;
  businessName: string;
  stats: {
    total: number;
    avgRating: number;
    fiveStar: number;
    negative: number;
    needsReply: number;
  };
  reviews: Array<{
    rating: number;
    reviewerName: string | null;
    body: string | null;
    postedAt: Date;
  }>;
  appUrl: string;
}): string {
  const { stats, reviews: revs, appUrl } = args;
  const greeting = args.recipientName
    ? `Hi ${esc(args.recipientName.split(" ")[0] ?? "")},`
    : "Hi,";

  const reviewRows = revs
    .map((r) => {
      const stars =
        "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
      const color = r.rating <= 2 ? "#dc2626" : r.rating >= 4 ? "#16a34a" : "#ca8a04";
      return `
        <tr>
          <td style="padding:6px 8px; font-size:16px; color:${color};">${stars}</td>
          <td style="padding:6px 8px; font-size:13px;">${esc(r.reviewerName ?? "Anonymous")}</td>
          <td style="padding:6px 8px; font-size:13px; color:#666;">${esc(truncate(r.body ?? "", 80))}</td>
        </tr>`;
    })
    .join("");

  return `
    <div style="font-family:-apple-system,system-ui,sans-serif; max-width:600px; margin:0 auto; color:#111;">
      <p style="font-size:14px; color:#666; margin:0 0 4px;">AutoFiveStar · Weekly Digest</p>
      <h2 style="margin:0 0 12px;">${esc(args.businessName)} — This Week in Reviews</h2>
      <p>${greeting}</p>
      <p>Here's your weekly review summary:</p>

      <table style="width:100%; border-collapse:collapse; margin:16px 0;">
        <tr>
          <td style="padding:8px; text-align:center; background:#f0f9ff; border-radius:6px;">
            <div style="font-size:24px; font-weight:bold;">${stats.total}</div>
            <div style="font-size:12px; color:#666;">New reviews</div>
          </td>
          <td style="padding:8px; text-align:center; background:#f0fdf4; border-radius:6px;">
            <div style="font-size:24px; font-weight:bold;">${stats.avgRating.toFixed(1)}</div>
            <div style="font-size:12px; color:#666;">Avg rating</div>
          </td>
          <td style="padding:8px; text-align:center; background:#fef3c7; border-radius:6px;">
            <div style="font-size:24px; font-weight:bold;">${stats.fiveStar}</div>
            <div style="font-size:12px; color:#666;">5-star</div>
          </td>
          <td style="padding:8px; text-align:center; background:${stats.negative > 0 ? "#fef2f2" : "#f5f5f5"}; border-radius:6px;">
            <div style="font-size:24px; font-weight:bold; color:${stats.negative > 0 ? "#dc2626" : "#111"};">${stats.negative}</div>
            <div style="font-size:12px; color:#666;">Negative</div>
          </td>
        </tr>
      </table>

      ${stats.needsReply > 0 ? `<p style="background:#fef3c7; padding:10px 14px; border-radius:6px; font-size:14px;"><strong>${stats.needsReply} review${stats.needsReply === 1 ? "" : "s"} still need${stats.needsReply === 1 ? "s" : ""} a reply.</strong> <a href="${appUrl}/inbox?status=new" style="color:#2563eb;">Open inbox &rarr;</a></p>` : ""}

      ${revs.length > 0 ? `<table style="width:100%; border-collapse:collapse; margin:12px 0; font-size:13px;"><tbody>${reviewRows}</tbody></table>` : ""}

      <p>
        <a href="${appUrl}/dashboard"
           style="display:inline-block; background:#2563eb; color:#fff;
                  padding:10px 16px; border-radius:6px; text-decoration:none; font-size:14px;">
          View full dashboard
        </a>
      </p>
      <p style="color:#888; font-size:12px; margin-top:24px;">
        Update email preferences in <a href="${appUrl}/settings" style="color:#888;">settings</a>.
      </p>
    </div>
  `;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}
