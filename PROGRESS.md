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
- [x] Stripe Checkout for Starter/Growth/Pro (monthly + yearly)
- [x] Stripe Customer Portal
- [x] Stripe webhook handler with signature verification + dedup
- [x] Tier enforcement helpers (`lib/billing/entitlements.ts`)
- [ ] Google OAuth flow (`business.manage`)
- [ ] Encrypted token storage
- [ ] GBP client: list accounts, list locations, select/connect
- [ ] Inngest job: pull reviews every 15 min
- [ ] Upsert reviews by `source_review_id`
- [ ] Review inbox (unanswered/rating/date filters + detail panel)
- [ ] Deploy to Vercel
- [ ] Smoke test with real GBP

### PR #3 smoke path (local — Stripe billing)

1. Create three Stripe products in test mode (Starter, Growth, Pro), each
   with one monthly and one yearly recurring price:
   - Starter: $49/mo, $490/yr (2 months free baked in)
   - Growth: $99/mo, $990/yr
   - Pro: $199/mo, $1,990/yr
2. Copy the six price IDs into `.env.local`:
   `STRIPE_PRICE_STARTER_MONTHLY`, `STRIPE_PRICE_STARTER_YEARLY`,
   `STRIPE_PRICE_GROWTH_MONTHLY`, `STRIPE_PRICE_GROWTH_YEARLY`,
   `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`.
3. Install Stripe CLI: <https://stripe.com/docs/stripe-cli>.
   ```bash
   stripe login
   stripe listen --forward-to http://localhost:3000/api/stripe/webhook
   ```
   Copy the `whsec_…` printed by `stripe listen` into
   `STRIPE_WEBHOOK_SECRET` in `.env.local` and restart `npm run dev`.
4. Sign up, go to `/billing`. Toggle monthly/yearly. Click "Start 14-day
   trial" on Growth.
5. Stripe Checkout opens. Use card `4242 4242 4242 4242`, any future expiry,
   any CVC, any postal code.
6. Redirect back to `/billing?checkout=success`. Within a few seconds the
   webhook fires and updates:
   - `subscriptions` row created
   - `organizations.plan` updated to `growth`
   - `organizations.trial_ends_at` set
   - `usage_counters` row for the current month exists
   - `audit_logs` has `subscription.created` entries
7. Click "Open billing portal" → Stripe Portal → cancel subscription. The
   `customer.subscription.updated` webhook syncs `cancel_at_period_end=true`,
   and once the period ends `customer.subscription.deleted` reverts the org
   plan to `starter`.
8. Run `stripe trigger invoice.payment_failed` — webhook accepts it and
   writes an audit log entry.

### Webhook events handled

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Unknown event types receive a 200 (Stripe will stop retrying).

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
