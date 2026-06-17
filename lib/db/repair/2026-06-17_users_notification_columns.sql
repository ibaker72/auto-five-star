-- Idempotent production repair for the users-notification columns and the
-- notification_status enum. Mirrors what migration 0002 would have done,
-- but uses IF NOT EXISTS so it is safe to re-run and safe to apply on a
-- database where the Drizzle migration tracker is missing.
--
-- Context: production Supabase schema was synced out-of-band (likely via
-- `drizzle-kit push` or hand-applied SQL) and never registered through the
-- Drizzle migrator, so `drizzle.__drizzle_migrations` does not exist. As a
-- result, several pieces from migration 0002 (which adds the SMS-alert
-- columns to users and the 'skipped' notification status) were missed.
-- This script closes that gap without touching anything that is already in
-- place. It does NOT register itself in the Drizzle tracker.
--
-- How to apply:
--   psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f lib/db/repair/2026-06-17_users_notification_columns.sql
--
-- DIRECT_URL must be the direct Supabase connection (db.<ref>.supabase.co:5432),
-- not the pooler.

-- 1) Add the new enum value first. ALTER TYPE ... ADD VALUE has historical
--    transaction restrictions, so we run it on its own. IF NOT EXISTS makes
--    this safe to re-run.
ALTER TYPE public.notification_status ADD VALUE IF NOT EXISTS 'skipped';

-- 2) Backfill the three users columns. Each ADD COLUMN is independent and
--    idempotent. Wrapped in a single transaction so partial application is
--    not possible.
BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notification_phone text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS alerts_email_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS alerts_sms_enabled boolean NOT NULL DEFAULT false;

COMMIT;

-- Sanity check (read-only): list the users columns after the patch.
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'users'
--  ORDER BY ordinal_position;
