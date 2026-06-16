import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { inngest } from "../client";
import { db } from "@/lib/db/client";
import {
  integrationTokens,
  locations,
  organizations,
  subscriptions,
} from "@/lib/db/schema";
import { pullGoogleReviews } from "@/lib/integrations/google";

const ALLOWED_SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
] as const satisfies ReadonlyArray<
  "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "incomplete_expired" | "unpaid" | "paused"
>;

/**
 * Cron: every 15 minutes, fan out a sync request per eligible (org, location).
 * The actual fetch + upsert happens in pullReviewsForLocation so we can apply
 * per-location concurrency / retry semantics.
 */
export const pullReviewsCron = inngest.createFunction(
  { id: "pull-reviews-cron" },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    const targets = await step.run("collect-targets", async () => {
      // Org must have:
      // - an active-ish subscription (or no subscriptions row at all = still in
      //   the bootstrap trial window — covered by org.trial_ends_at > now)
      // - a Google integration row (i.e. the connect step ran)
      const subs = await db
        .select({ orgId: subscriptions.orgId })
        .from(subscriptions)
        .where(
          inArray(
            subscriptions.status,
            ALLOWED_SUBSCRIPTION_STATUSES as unknown as Array<
              (typeof ALLOWED_SUBSCRIPTION_STATUSES)[number]
            >,
          ),
        );
      const subOrgIds = new Set(subs.map((s) => s.orgId));

      // Also include orgs whose trial hasn't expired and that have a Google
      // connection — these don't have a subscription row yet but should sync.
      const trialingOrgs = await db
        .select({ id: organizations.id, trialEndsAt: organizations.trialEndsAt })
        .from(organizations);
      const now = Date.now();
      for (const o of trialingOrgs) {
        if (o.trialEndsAt && o.trialEndsAt.getTime() > now) {
          subOrgIds.add(o.id);
        }
      }

      if (subOrgIds.size === 0) return [];

      const connected = await db
        .select({ orgId: integrationTokens.orgId })
        .from(integrationTokens)
        .where(eq(integrationTokens.provider, "google"));
      const eligibleOrgIds = new Set(
        connected.map((c) => c.orgId).filter((id) => subOrgIds.has(id)),
      );
      if (eligibleOrgIds.size === 0) return [];

      const orgIdList = Array.from(eligibleOrgIds);
      const locs = await db
        .select({ id: locations.id, orgId: locations.orgId })
        .from(locations)
        .where(
          and(
            inArray(locations.orgId, orgIdList),
            eq(locations.source, "google"),
            isNotNull(locations.connectedAt),
          ),
        );

      return locs.map((l) => ({ orgId: l.orgId, locationId: l.id }));
    });

    if (targets.length === 0) {
      return { enqueued: 0 };
    }

    await step.sendEvent(
      "fan-out",
      targets.map((t) => ({
        name: "reviews/sync.requested" as const,
        data: t,
      })),
    );

    return { enqueued: targets.length };
  },
);

export const pullReviewsForLocation = inngest.createFunction(
  {
    id: "pull-reviews-for-location",
    concurrency: { limit: 5 },
    retries: 3,
  },
  { event: "reviews/sync.requested" },
  async ({ event, step }) => {
    const { orgId, locationId } = event.data;

    const result = await step.run("pull-google-reviews", async () => {
      const out = await pullGoogleReviews(orgId, locationId);
      return out;
    });

    if (result.newReviewIds.length > 0) {
      await step.sendEvent(
        "fan-out-new-reviews",
        result.newReviewIds.map((reviewId) => ({
          name: "reviews/new.detected" as const,
          data: { orgId, reviewId },
        })),
      );
    }

    return {
      orgId,
      locationId,
      fetched: result.fetched,
      inserted: result.inserted,
      updated: result.updated,
      new: result.newReviewIds.length,
    };
  },
);
