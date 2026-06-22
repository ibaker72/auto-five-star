-- Drip Campaign Scheduler: let review-request campaigns pace their sends over
-- several days instead of all at once. New columns are additive and idempotent
-- so immediate-send campaigns keep working unchanged (send_mode defaults to
-- 'immediate', and existing recipient rows simply have null schedule fields).

ALTER TABLE "review_request_campaigns" ADD COLUMN IF NOT EXISTS "send_mode" text DEFAULT 'immediate' NOT NULL;--> statement-breakpoint
ALTER TABLE "review_request_campaigns" ADD COLUMN IF NOT EXISTS "daily_limit" integer;--> statement-breakpoint
ALTER TABLE "review_request_campaigns" ADD COLUMN IF NOT EXISTS "scheduled_start_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "review_request_recipients" ADD COLUMN IF NOT EXISTS "channel" text;--> statement-breakpoint
ALTER TABLE "review_request_recipients" ADD COLUMN IF NOT EXISTS "scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "review_request_recipients" ADD COLUMN IF NOT EXISTS "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_request_recipients_scheduled_at_idx" ON "review_request_recipients" USING btree ("scheduled_at");
