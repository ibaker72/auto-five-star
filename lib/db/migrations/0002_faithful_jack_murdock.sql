ALTER TYPE "notification_status" ADD VALUE 'skipped';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "alerts_email_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "alerts_sms_enabled" boolean DEFAULT false NOT NULL;