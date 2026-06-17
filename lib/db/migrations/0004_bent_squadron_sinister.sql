CREATE TABLE IF NOT EXISTS "audit_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text NOT NULL,
	"email" text NOT NULL,
	"website" text,
	"gbp_url" text,
	"industry" text,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_lead_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"score" integer,
	"report_json" jsonb,
	"demo_mode" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "funnel_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"audit_lead_id" uuid,
	"audit_request_id" uuid,
	"session_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_requests" ADD CONSTRAINT "audit_requests_audit_lead_id_audit_leads_id_fk" FOREIGN KEY ("audit_lead_id") REFERENCES "public"."audit_leads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "funnel_events" ADD CONSTRAINT "funnel_events_audit_lead_id_audit_leads_id_fk" FOREIGN KEY ("audit_lead_id") REFERENCES "public"."audit_leads"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "funnel_events" ADD CONSTRAINT "funnel_events_audit_request_id_audit_requests_id_fk" FOREIGN KEY ("audit_request_id") REFERENCES "public"."audit_requests"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_leads_email_idx" ON "audit_leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_leads_created_at_idx" ON "audit_leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_requests_lead_idx" ON "audit_requests" USING btree ("audit_lead_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_requests_created_at_idx" ON "audit_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funnel_events_type_created_idx" ON "funnel_events" USING btree ("event_type","created_at");