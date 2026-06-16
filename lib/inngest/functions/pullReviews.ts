import { inngest } from "../client";

/**
 * pullReviews — every 15 min, enqueue a sync for each connected location.
 * Full implementation lands in PR #5 once the GBP token-refresh path is wired.
 */
export const pullReviewsCron = inngest.createFunction(
  { id: "pull-reviews-cron" },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    await step.run("enqueue-syncs", async () => {
      // TODO: enumerate connected locations and send "reviews/sync.requested"
      return { enqueued: 0 };
    });
    return { ok: true };
  },
);

export const pullReviewsForLocation = inngest.createFunction(
  { id: "pull-reviews-for-location", concurrency: { limit: 5 } },
  { event: "reviews/sync.requested" },
  async ({ event, step }) => {
    await step.run("placeholder", async () => ({
      orgId: event.data.orgId,
      locationId: event.data.locationId ?? null,
      note: "PR #5 implements the actual GBP fetch + upsert",
    }));
    return { ok: true };
  },
);
