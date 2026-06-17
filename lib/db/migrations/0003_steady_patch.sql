ALTER TABLE "brand_voices" ADD COLUMN "tone_preset" text;--> statement-breakpoint
ALTER TABLE "brand_voices" ADD COLUMN "response_length" text;--> statement-breakpoint
ALTER TABLE "brand_voices" ADD COLUMN "emoji_allowed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "brand_voices" ADD COLUMN "custom_notes" text;--> statement-breakpoint
ALTER TABLE "brand_voices" ADD COLUMN "industry_pack" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "onboarding_step" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "onboarding_completed_at" timestamp with time zone;