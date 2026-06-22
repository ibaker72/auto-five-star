import { eq } from "drizzle-orm";
import { inngest } from "../client";
import { processReviewAlert } from "@/lib/notifications/review-alerts";
import { tryAttributeReview } from "@/lib/review-requests/attribution";
import { db } from "@/lib/db/client";
import { reviews } from "@/lib/db/schema";

export const sendReviewAlerts = inngest.createFunction(
  {
    id: "send-review-alerts",
    concurrency: { limit: 10 },
    retries: 2,
    triggers: { event: "reviews/new.detected" },
  },
  async ({ event, step }) => {
    const { orgId, reviewId } = event.data;

    const alertResult = await step.run("process-review-alert", () =>
      processReviewAlert({ orgId, reviewId }),
    );

    const attribution = await step.run("try-attribute-review", async () => {
      const review = await db
        .select({ reviewerName: reviews.reviewerName })
        .from(reviews)
        .where(eq(reviews.id, reviewId))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (!review) return { matched: false, recipientId: null };

      return tryAttributeReview({
        orgId,
        reviewId,
        reviewerName: review.reviewerName,
      });
    });

    return { ...alertResult, attribution };
  },
);
