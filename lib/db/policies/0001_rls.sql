-- AutoFiveStar RLS policies
-- Apply AFTER schema migration. Idempotent (drops + recreates policies).

-- ---------------------------------------------------------------------------
-- Helper: current user's org IDs
-- ---------------------------------------------------------------------------
create or replace function public.current_user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.org_members where user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on all tenant-scoped tables
-- ---------------------------------------------------------------------------
alter table public.organizations         enable row level security;
alter table public.org_members           enable row level security;
alter table public.locations             enable row level security;
alter table public.reviews               enable row level security;
alter table public.response_drafts       enable row level security;
alter table public.review_responses      enable row level security;
alter table public.templates             enable row level security;
alter table public.brand_voices          enable row level security;
alter table public.subscriptions         enable row level security;
alter table public.usage_counters        enable row level security;
alter table public.audit_logs            enable row level security;
alter table public.integration_tokens    enable row level security;
alter table public.notifications         enable row level security;
alter table public.competitor_snapshots  enable row level security;
alter table public.users                 enable row level security;

-- ---------------------------------------------------------------------------
-- users: self-only
-- ---------------------------------------------------------------------------
drop policy if exists users_self_select on public.users;
create policy users_self_select on public.users
  for select using (id = auth.uid());

drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- organizations: members can read; owners/admins update
-- ---------------------------------------------------------------------------
drop policy if exists orgs_member_select on public.organizations;
create policy orgs_member_select on public.organizations
  for select using (id in (select public.current_user_org_ids()));

drop policy if exists orgs_admin_update on public.organizations;
create policy orgs_admin_update on public.organizations
  for update using (
    exists (
      select 1 from public.org_members
      where org_id = organizations.id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- Inserts happen via service role (signup flow), not via authenticated user.

-- ---------------------------------------------------------------------------
-- org_members: members of the org can see other members; owners manage
-- ---------------------------------------------------------------------------
drop policy if exists org_members_select on public.org_members;
create policy org_members_select on public.org_members
  for select using (org_id in (select public.current_user_org_ids()));

drop policy if exists org_members_owner_manage on public.org_members;
create policy org_members_owner_manage on public.org_members
  for all using (
    exists (
      select 1 from public.org_members m
      where m.org_id = org_members.org_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- Generic tenant policies (select/insert/update/delete by org membership)
-- ---------------------------------------------------------------------------
-- locations
drop policy if exists locations_tenant on public.locations;
create policy locations_tenant on public.locations
  for all using (org_id in (select public.current_user_org_ids()))
  with check (org_id in (select public.current_user_org_ids()));

-- reviews (read-only for users; writes via service role from jobs)
drop policy if exists reviews_tenant_select on public.reviews;
create policy reviews_tenant_select on public.reviews
  for select using (org_id in (select public.current_user_org_ids()));

drop policy if exists reviews_tenant_update on public.reviews;
create policy reviews_tenant_update on public.reviews
  for update using (org_id in (select public.current_user_org_ids()))
  with check (org_id in (select public.current_user_org_ids()));

-- response_drafts
drop policy if exists response_drafts_tenant on public.response_drafts;
create policy response_drafts_tenant on public.response_drafts
  for all using (org_id in (select public.current_user_org_ids()))
  with check (org_id in (select public.current_user_org_ids()));

-- review_responses
drop policy if exists review_responses_tenant on public.review_responses;
create policy review_responses_tenant on public.review_responses
  for all using (org_id in (select public.current_user_org_ids()))
  with check (org_id in (select public.current_user_org_ids()));

-- templates (system templates visible to all authenticated users)
drop policy if exists templates_select on public.templates;
create policy templates_select on public.templates
  for select using (
    is_system = true
    or org_id in (select public.current_user_org_ids())
  );

drop policy if exists templates_tenant_write on public.templates;
create policy templates_tenant_write on public.templates
  for all using (
    org_id is not null
    and org_id in (select public.current_user_org_ids())
  )
  with check (
    org_id is not null
    and org_id in (select public.current_user_org_ids())
  );

-- brand_voices
drop policy if exists brand_voices_tenant on public.brand_voices;
create policy brand_voices_tenant on public.brand_voices
  for all using (org_id in (select public.current_user_org_ids()))
  with check (org_id in (select public.current_user_org_ids()));

-- subscriptions (read-only for tenant; service role writes)
drop policy if exists subscriptions_tenant_select on public.subscriptions;
create policy subscriptions_tenant_select on public.subscriptions
  for select using (org_id in (select public.current_user_org_ids()));

-- usage_counters (read-only for tenant)
drop policy if exists usage_counters_tenant_select on public.usage_counters;
create policy usage_counters_tenant_select on public.usage_counters
  for select using (org_id in (select public.current_user_org_ids()));

-- audit_logs (read-only for tenant; INSERT-only via service role; no UPDATE/DELETE policy)
drop policy if exists audit_logs_tenant_select on public.audit_logs;
create policy audit_logs_tenant_select on public.audit_logs
  for select using (org_id in (select public.current_user_org_ids()));
-- Intentionally NO update / delete policies => append-only for end users.
-- Service role bypasses RLS, so the server-side audit writer can INSERT.

-- integration_tokens (read-only metadata for tenant; service role writes)
drop policy if exists integration_tokens_tenant_select on public.integration_tokens;
create policy integration_tokens_tenant_select on public.integration_tokens
  for select using (org_id in (select public.current_user_org_ids()));

-- notifications
drop policy if exists notifications_tenant on public.notifications;
create policy notifications_tenant on public.notifications
  for select using (org_id in (select public.current_user_org_ids()));

-- competitor_snapshots
drop policy if exists competitor_snapshots_tenant on public.competitor_snapshots;
create policy competitor_snapshots_tenant on public.competitor_snapshots
  for select using (org_id in (select public.current_user_org_ids()));
