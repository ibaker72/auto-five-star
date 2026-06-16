import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "auto-five-star",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

export type AppEvents = {
  "reviews/sync.requested": {
    data: { orgId: string; locationId?: string };
  };
  "reviews/synced": {
    data: { orgId: string; locationId: string; newCount: number };
  };
  "drafts/generate.requested": {
    data: { orgId: string; reviewId: string };
  };
  "alerts/review.received": {
    data: { orgId: string; reviewId: string; rating: number };
  };
};
