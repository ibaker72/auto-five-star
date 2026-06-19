-- Add optional city/location and phone columns to free-audit leads so the
-- sales team can store and query them (previously only emailed).

ALTER TABLE "audit_leads" ADD COLUMN IF NOT EXISTS "city" text;--> statement-breakpoint
ALTER TABLE "audit_leads" ADD COLUMN IF NOT EXISTS "phone" text;
