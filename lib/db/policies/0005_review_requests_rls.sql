-- AutoFiveStar PR #9 — RLS for review-request engine.
-- Org-scoped, mirrors existing tenant patterns from policies/0001_rls.sql.

alter table public.review_request_campaigns enable row level security;
alter table public.review_request_recipients enable row level security;
alter table public.review_request_events enable row level security;

-- review_request_campaigns
drop policy if exists review_request_campaigns_tenant on public.review_request_campaigns;
create policy review_request_campaigns_tenant on public.review_request_campaigns
  for all using (org_id in (select public.current_user_org_ids()))
  with check (org_id in (select public.current_user_org_ids()));

-- review_request_recipients
drop policy if exists review_request_recipients_tenant on public.review_request_recipients;
create policy review_request_recipients_tenant on public.review_request_recipients
  for all using (org_id in (select public.current_user_org_ids()))
  with check (org_id in (select public.current_user_org_ids()));

-- review_request_events: read-only for tenants; service role inserts.
drop policy if exists review_request_events_tenant_select on public.review_request_events;
create policy review_request_events_tenant_select on public.review_request_events
  for select using (org_id in (select public.current_user_org_ids()));
-- intentionally no insert/update/delete policies for end users.
