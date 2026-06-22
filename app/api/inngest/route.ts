import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  pullReviewsCron,
  pullReviewsForLocation,
} from "@/lib/inngest/functions/pullReviews";
import { sendReviewAlerts } from "@/lib/inngest/functions/sendAlerts";
import { weeklyDigest } from "@/lib/inngest/functions/weeklyDigest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    pullReviewsCron,
    pullReviewsForLocation,
    sendReviewAlerts,
    weeklyDigest,
  ],
});
