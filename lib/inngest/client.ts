import { Inngest, EventSchemas } from "inngest";

type AppEvents = {
  "reviews/poll.tick": { data: Record<string, never> };
  "reviews/sync.requested": {
    data: { orgId: string; locationId: string };
  };
  "reviews/new.detected": {
    data: { orgId: string; reviewId: string };
  };
};

export const inngest = new Inngest({
  id: "auto-five-star",
  eventKey: process.env.INNGEST_EVENT_KEY,
  schemas: new EventSchemas().fromRecord<AppEvents>(),
});
