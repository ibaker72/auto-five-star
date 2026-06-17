-- AutoFiveStar PR #8: lock down audit/funnel tables.
-- These tables are written and read server-side only. The marketing site
-- posts forms to API routes that use the service role / Drizzle superuser
-- connection. RLS is enabled with no anon policies, so any direct API
-- access (e.g. via the Supabase client) is denied.

alter table public.audit_leads     enable row level security;
alter table public.audit_requests  enable row level security;
alter table public.funnel_events   enable row level security;

-- No SELECT/INSERT/UPDATE/DELETE policies. Service role bypasses RLS, so
-- server-side code still works; anon and authenticated roles cannot read or
-- write leads through Supabase clients.
