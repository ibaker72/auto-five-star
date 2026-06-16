# Progress

Week-by-week MVP tracker.

## Week 1 — Sign up, connect GBP, see real reviews

- [x] Repo foundation (Next.js 14, TS strict, Tailwind, shadcn/ui)
- [x] Drizzle schema (15 tables)
- [x] `.env.example`, README, DECISIONS, PROGRESS
- [x] Supabase client/server helpers + middleware
- [x] Migration 0001 (schema) generated
- [x] Migration 0002 (RLS policies) authored
- [x] Seed script (system templates + demo org)
- [x] Supabase Auth (email + Google login on standard scopes)
- [x] Org creation on signup + Stripe customer creation (idempotent bootstrap)
- [ ] Stripe Checkout for Starter/Growth/Pro
- [ ] Stripe webhook handler with signature verification
- [ ] Google OAuth flow (`business.manage`)
- [ ] Encrypted token storage
- [ ] GBP client: list accounts, list locations, select/connect
- [ ] Inngest job: pull reviews every 15 min
- [ ] Upsert reviews by `source_review_id`
- [ ] Review inbox (unanswered/rating/date filters + detail panel)
- [ ] Deploy to Vercel
- [ ] Smoke test with real GBP

### PR #2 smoke path (local)

1. `cp .env.example .env.local` and fill in Supabase URL/anon/service-role
   keys, `DATABASE_URL`, `ENCRYPTION_KEY` (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`),
   and any Stripe test keys. Skip GBP/Twilio/Yelp for this PR.
2. In Supabase SQL editor, run `lib/db/migrations/0000_*.sql` then
   `lib/db/policies/0001_rls.sql`.
3. `npm run db:seed` (optional — system templates).
4. `npm run dev`, visit <http://localhost:3000>.
5. Sign up with email + password.
   - If email confirmation is enabled in Supabase, click the link → lands at
     `/auth/callback` → bootstrap runs → `/onboarding`.
   - If confirmation is disabled, signup redirects to `/onboarding` directly.
6. Verify in DB:
   - `users` has your row
   - `organizations` has one row with a Stripe customer ID (if Stripe key set)
   - `org_members` has one row with role `owner`
   - `brand_voices` has one row
   - `usage_counters` has one row for the current month
   - `audit_logs` has one `org.created` entry
7. Click "Go to dashboard" → counts render. Click around inbox/locations/
   settings/billing — all load without errors.
8. Log out → redirected to `/login`. Log back in → land at `/dashboard`
   without re-running bootstrap (idempotent).
9. Try logging in with Google → consent screen → `/auth/callback` →
   `/dashboard`. The same user reuses the same org.

## Week 2 — AI drafts → approve → post to Google

- [ ] `responseGenerator.v1.ts` prompt + zod-validated structured output
- [ ] Generate 3 variants per review
- [ ] Store drafts, track cost/usage per org
- [ ] Approval UI (review left, drafts right, tabs, inline editor, diff)
- [ ] GBP reply posting
- [ ] Token-refresh, rate-limit, removed-review handling
- [ ] Update review status + write audit log
- [ ] Yelp read-only pull
- [ ] Resend email alerts
- [ ] Twilio SMS alerts (Pro tier, 1-2 star reviews)
- [ ] QA pass

## Week 3 — Feels like a real $99/mo SaaS

- [ ] Onboarding wizard (connect → pick locations → industry → tone → samples)
- [ ] Brand voice tuning + voice-match score
- [ ] Analytics dashboard (Recharts)
- [ ] Competitor snapshot
- [ ] Industry template packs (HVAC, dental, restaurant, landscaping, moving,
      auto repair, real estate)
- [ ] Bulk actions (Pro)

## Week 4 — Sales-ready launch

- [ ] Public landing page (autofivestar.com)
- [ ] Pricing + FAQ + demo video area
- [ ] Free Reputation Audit tool (PDF, email-gated)
- [ ] Referral system
- [ ] CSV import for past clients
- [ ] Outreach emails using unanswered review count
- [ ] Launch checklist
