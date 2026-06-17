import { inngest } from "../client";
import { processReviewAlert } from "@/lib/notifications/review-alerts";

export const sendReviewAlerts = inngest.createFunction(
  {
    id: "send-review-alerts",
    concurrency: { limit: 10 },
    retries: 2,
  },
  { event: "reviews/new.detected" },
  async ({ event, step }) => {
    const { orgId, reviewId } = event.data;
    const result = await step.run("process-review-alert", () =>
      processReviewAlert({ orgId, reviewId }),
    );
    return result;
  },
);
