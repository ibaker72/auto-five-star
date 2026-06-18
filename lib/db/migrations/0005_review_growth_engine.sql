-- PR #9: Review growth engine. Adds three tables for outbound review-request
-- campaigns, per-recipient sends, and an append-only event log.

CREATE TABLE IF NOT EXISTS "review_request_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"location_id" uuid,
	"name" text NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"message_template" text NOT NULL,
	"google_review_url" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_request_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_request_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"campaign_id" uuid,
	"recipient_id" uuid,
	"event_name" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_request_campaigns" ADD CONSTRAINT "review_request_campaigns_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_request_campaigns" ADD CONSTRAINT "review_request_campaigns_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_request_campaigns" ADD CONSTRAINT "review_request_campaigns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_request_recipients" ADD CONSTRAINT "review_request_recipients_campaign_id_review_request_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."review_request_campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_request_recipients" ADD CONSTRAINT "review_request_recipients_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_request_events" ADD CONSTRAINT "review_request_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_request_events" ADD CONSTRAINT "review_request_events_campaign_id_review_request_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."review_request_campaigns"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_request_events" ADD CONSTRAINT "review_request_events_recipient_id_review_request_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."review_request_recipients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_request_campaigns_org_idx" ON "review_request_campaigns" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_request_campaigns_status_idx" ON "review_request_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_request_campaigns_created_at_idx" ON "review_request_campaigns" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_request_recipients_campaign_idx" ON "review_request_recipients" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_request_recipients_org_idx" ON "review_request_recipients" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_request_recipients_status_idx" ON "review_request_recipients" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_request_recipients_created_at_idx" ON "review_request_recipients" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_request_events_org_idx" ON "review_request_events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_request_events_campaign_idx" ON "review_request_events" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_request_events_created_at_idx" ON "review_request_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_request_events_event_idx" ON "review_request_events" USING btree ("event_name");
