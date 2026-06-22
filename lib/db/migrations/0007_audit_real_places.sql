-- Capture real Google Places enrichment on free-audit leads so the sales team
-- can store and query the matched place, its rating, and review count. These
-- are null when Places is unavailable and the audit falls back to sample mode.

ALTER TABLE "audit_leads" ADD COLUMN IF NOT EXISTS "place_id" text;--> statement-breakpoint
ALTER TABLE "audit_leads" ADD COLUMN IF NOT EXISTS "google_rating" real;--> statement-breakpoint
ALTER TABLE "audit_leads" ADD COLUMN IF NOT EXISTS "google_review_count" integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_leads_place_id_idx" ON "audit_leads" USING btree ("place_id");
