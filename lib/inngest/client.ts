import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "auto-five-star",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
