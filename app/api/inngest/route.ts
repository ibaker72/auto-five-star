import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  pullReviewsCron,
  pullReviewsForLocation,
} from "@/lib/inngest/functions/pullReviews";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [pullReviewsCron, pullReviewsForLocation],
});
