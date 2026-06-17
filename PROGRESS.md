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
- [x] Google OAuth flow (`business.manage`)
- [x] Encrypted token storage + signed-state CSRF protection
- [x] GBP client: list accounts, list locations, select/connect
- [x] Upsert reviews by `source_review_id` (manual sync action)
- [x] Review inbox (status / rating / source filters + detail link)
- [ ] Inngest job: pull reviews every 15 min
- [ ] Deploy to Vercel
- [ ] Smoke test with real GBP

### PR #8 smoke path (local — marketing site + audit funnel)

1. Apply migration `lib/db/migrations/0004_bent_squadron_sinister.sql` in
   Supabase, then `lib/db/policies/0004_audit_rls.sql` to lock down the
   three new tables.
2. `npm run dev`. Sign out (or open an incognito window).
3. Visit `/`, `/features`, `/pricing`, `/contact` — pages render with the
   marketing header / footer, no auth gate.
4. `/free-audit`:
   - Fill in business name + email (others optional) → submit.
   - The form POSTs to `/api/audit`. With `EMAIL_LIVE=false` you'll see
     `[email/fixture]` lines in the server log for the prospect email and
     the sales-lead email.
   - Browser is pushed to `/free-audit/results/{request_id}`.
5. Verify in DB:
   - `audit_leads` has the new row.
   - `audit_requests` has `status=completed`, `demo_mode=true`, `score`
     populated, `report_json` contains the report + inputs + rationale.
   - `funnel_events` has `audit_started` + `audit_completed` +
     `audit_email_sent` rows for this session.
6. Results page:
   - Score header with grade pill and breakdown bars.
   - "Demo data" alert at the top with the rationale.
   - Strengths / opportunities / recommendations cards.
   - Three tracked CTAs: **Start Free Trial**, **Book Demo**, **Contact
     Sales**. Clicking each records the matching funnel event (use
     `select * from funnel_events order by created_at desc limit 10;` to
     confirm) and navigates.
7. Rate limiting:
   - Re-submit the same email 6 times within an hour → 6th request
     returns 429 with the "Too many audits…" message.
   - 11 audit requests from the same IP within an hour → upstream IP
     limiter fires (when Upstash is configured).
8. SEO:
   - `view-source:/pricing` → has `<script type="application/ld+json">`
     with the FAQ schema.
   - All pages have OpenGraph + Twitter + canonical tags.
   - `/free-audit/results/[id]` has `robots: noindex, nofollow`.

### PR #7 smoke path (local — onboarding, brand voice, analytics, bulk)

1. Apply the new migration in Supabase:
   `lib/db/migrations/0003_steady_patch.sql` (adds onboarding tracking
   columns to `organizations` and brand-voice extension columns to
   `brand_voices`).
2. `npm run dev`. Log in as a fresh user (or clear
   `organizations.onboarding_completed_at` and `onboarding_step` on an
   existing one).
3. You land at `/onboarding?step=welcome` automatically (the redirect
   from `/`). Click **Start setup**.
4. Business step → set the name and save. Industry step → pick a vertical
   (the brand voice gets seeded from the pack defaults).
5. Google step → if not connected, it links to `/locations`. Click
   **Continue** to proceed even when fixture mode is off — connecting
   Google is optional during onboarding.
6. Notifications step → toggle email/SMS, type a phone, save.
7. Voice step → tweak tone preset, response length, emoji, signature, notes
   → **Finish setup**. You land on `/dashboard` and the "Finish setup" nav
   badge disappears.
8. `/dashboard`:
   - Stats: Total reviews / Avg rating / Response rate / AI usage.
   - Second row: Unanswered / This week / This month / Posted.
   - Two cards: rating distribution (CSS bars) + 8-week trend (CSS bars).
   - Empty-state cards if there are no reviews yet.
9. `/settings`:
   - Onboarding completion row shows the completion date.
   - Industry pack picker, Brand voice form, Notifications form all save
     independently.
10. `/inbox` (still works as before):
    - New top-left checkbox per row.
    - Sticky bulk-actions bar with "0 selected" indicator.
    - On Starter/Growth: bar shows "Bulk actions are Pro-only. Upgrade →"
      and buttons are disabled.
    - On Pro: select 2-3 reviews, click **Generate drafts** (uses cached
      drafts where available), **Post selected** (posts to Google in
      fixture or live mode), **Mark skipped**, **Export CSV** (downloads a
      `autofivestar-reviews-YYYY-MM-DD.csv`).
11. Generate a draft on any review → the new brand voice instructions
    (tone preset, length, emoji policy, custom notes) flow into the user
    message. Inspect `audit_logs` for a `draft.generated` row.

### PR #6 smoke path (local — poller + alerts)

Prereqs: PR #4 (Google connected, location connected) + PR #5 (AI generate
working).

1. Apply the new migration in Supabase:
   `lib/db/migrations/0002_faithful_jack_murdock.sql` (adds three columns
   to `users` + adds `skipped` to the `notification_status` enum).
2. Install Inngest CLI: `npm i -g inngest-cli` (or
   `npx inngest-cli@latest dev`).
3. Start the Inngest dev server in another terminal:
   ```bash
   npx inngest-cli@latest dev
   ```
   It auto-discovers <http://localhost:3000/api/inngest>. Visit
   <http://localhost:8288> to inspect runs.
4. Start the Next.js app: `npm run dev`. The poller is now registered.
5. Open `/settings` → enable Email alerts (default on), enable SMS alerts
   if the org is on Growth/Pro, fill in `+15551234567` as the
   notification phone. Save.
6. Trigger the cron manually from the Inngest dev UI:
   - Functions → `pull-reviews-cron` → "Invoke"
   - Or send a `reviews/sync.requested` event with
     `{ "orgId": "...", "locationId": "..." }` to skip the cron.
7. Expected behavior (in fixture modes `GBP_LIVE=false`, `EMAIL_LIVE=false`,
   `SMS_LIVE=false`):
   - `pullGoogleReviews` upserts 8–12 fixture reviews per location.
   - On the **first run** every review is `inserted`, so each one fans out a
     `reviews/new.detected` event.
   - For each event:
     - 1–2 star → email sent (fixture log) + SMS sent (fixture log if
       Growth/Pro + phone + opted in)
     - 3 star → `notifications` row with `event=review.alert.daily_digest_pending`,
       `status=queued`
     - 4–5 star → `event=review.alert.weekly_digest_pending`, `status=queued`
   - On **subsequent runs** no new review IDs come back (xmax≠0 on upsert),
     so no events fan out.
8. Verify in DB:
   - `notifications` has one row per (recipient × channel × review) and
     payload contains the review and location ids
   - `_fixture: true` merged into payload for fixture-sent rows
   - Skipped rows have `errorMessage` like `missing_phone_number`,
     `alerts_sms_disabled`, `plan_does_not_allow_sms`, or `sms_disabled`
9. `/dashboard` shows:
   - "Last review sync" timestamp in the header
   - "Negative reviews to handle" card listing up to 3 urgent reviews
   - "Pull reviews now" ghost button
10. `/inbox` rows show the rose **Needs attention** pill on unanswered 1–2
    star reviews.

Live mode (when ready):

- `RESEND_API_KEY=re_…`, `RESEND_FROM_EMAIL=hello@your-domain.com`,
  `EMAIL_LIVE=true` — once your domain is verified at Resend.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`,
  `SMS_LIVE=true` — only after A2P 10DLC campaign approval.
- Production with `EMAIL_LIVE=false` / `SMS_LIVE=false` still works: those
  notifications get `status=skipped` with a clear `errorMessage` instead of
  silently swallowing the alert.

### PR #5 smoke path (local — AI drafts + post to Google)

Prereqs from PR #4: signed up, connected Google (fixture mode), pulled
reviews on at least one location.

1. With `.env.local` having `AI_LIVE=false` (default) — no OpenAI key
   required:
   - `npm run dev`, open `/inbox`, click a review.
   - The right pane shows **Generate AI drafts**. Click it.
   - Three variants appear (Warm / Professional / Brief), tuned to the
     review's sentiment.
   - The `usage_counters` row for this month bumps `ai_responses_used` by 1.
2. Pick a variant tab. The textarea fills with the draft body. Edit it.
3. Click **Save edits**. A `review_responses` row is created with
   `status=draft`; the review stays as `drafted`.
4. Click **Approve**. Status flips to `approved` on both rows.
5. Click **Post to Google**. With `GBP_LIVE=false` the post is simulated:
   - `review_responses.status=posted`, `posted_at` set,
     `source_response_id=fixture-…`
   - `reviews.status=posted`
   - Audit log gets `response.posted` with `fixture: true`
6. Go back to `/inbox`. The row now shows a green **Posted** action and a
   `posted` status badge.
7. Negative-review path: open a 1- or 2-star review. The workspace shows
   the "Negative review: review carefully…" warning.
8. Yelp path (if a Yelp review exists from PR #4 fixtures): the **Post**
   button is replaced with **Copy to clipboard** and the explanatory note.
9. Quota path:
   - Switch the org plan to Starter via `/billing` or by updating the DB
     row directly.
   - Manually set `usage_counters.ai_responses_used = 50`.
   - Click Generate → the action returns "Monthly AI response quota
     reached" and links to `/billing`.

Live OpenAI:

1. Add `OPENAI_API_KEY=sk-…` and set `AI_LIVE=true`.
2. Restart dev. Click Generate. Three variants are now generated by the
   model named in `OPENAI_MODEL_PRIMARY` (default `gpt-4o`).
3. `response_drafts.model` reflects the model id; `cost_cents` is the
   estimated USD-cents total split across the three rows.

Live Google posting:

1. Once Google approves `business.manage`, set `GBP_LIVE=true` and
   reconnect a real location.
2. Generate + approve + post → the real `accounts/{a}/locations/{l}/reviews/{r}/reply`
   endpoint is hit. Errors map to typed reasons (`not_connected`,
   `refresh_failed`, `google_rate_limited`, `review_removed`, `unauthorized`,
   `google_api_error`) which the action surfaces back to the UI.

### PR #4 smoke path (local — GBP connect + manual sync)

Demo mode (no Google Cloud setup required):

1. Make sure `.env.local` has `GBP_LIVE=false` (default) and
   `ENCRYPTION_KEY` set.
2. `npm run dev`, sign in, go to `/locations`.
3. Click **Connect Google**. You'll be back at `/locations?google=connected`
   instantly — an encrypted synthetic token row is in `integration_tokens`.
4. Pick the **AutoFiveStar Demo HVAC** account (or Dental). A list of fake
   locations appears.
5. Click **Connect** on one. You land at `/locations?google=location_connected`
   and the location appears in the "Connected locations" grid.
6. Click **Pull reviews now** on the location. 8-12 fixture reviews land in
   the DB and the badge updates.
7. Go to `/inbox`. The reviews show with stars, reviewer name, status
   badges, and source. Filter by status / rating / source.
8. Click any review → `/reviews/[id]` shows the full review and the
   placeholder for the AI drafts (PR #5).
9. Try connecting a second location on Starter plan → the **Connect**
   button is disabled with "Quota reached".

Live mode (after Google approves `business.manage`):

1. In Google Cloud Console, create an OAuth 2.0 Web client with redirect
   `https://your-domain/api/integrations/google/callback`. Request the
   `https://www.googleapis.com/auth/business.manage` scope on the OAuth
   consent screen and submit for verification.
2. Set `.env.local`:
   ```
   GBP_LIVE=true
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback
   ```
3. Restart dev. Click **Connect Google** → Google consent screen → land
   back at `/locations?google=connected` with real tokens in
   `integration_tokens`.
4. Account / location picker now shows real GBP data. Connecting + pulling
   reviews talks to the live API.

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

- [x] `responseGenerator.v1.ts` prompt + zod-validated structured output
- [x] Generate 3 variants per review
- [x] Store drafts, track cost/usage per org
- [x] Approval UI (review left, drafts right, tabs, inline editor)
- [x] GBP reply posting (fixture + live modes)
- [x] Token-refresh, rate-limit, removed-review handling
- [x] Update review status + write audit log
- [x] Yelp read-only pull (PR #4 fixture; UI shows "copy to clipboard" with
      post button disabled)
- [x] Inngest 15-minute review poller (cron → per-location fan-out → alert fan-out)
- [x] Resend email alerts for new reviews (immediate for 1-2 stars,
      digest-pending row for 3-5 stars)
- [x] Twilio SMS alerts (Growth/Pro tier, 1-2 star reviews only)
- [x] Settings UI for notification prefs (email/SMS toggles + phone)
- [ ] QA pass

## Week 3 — Feels like a real $99/mo SaaS

- [x] Onboarding wizard (welcome → business → industry → Google → notifications → voice → done)
- [x] Brand voice tuning (tone preset, response length, emoji, signature, custom notes)
- [x] Analytics dashboard (avg rating, response rate, weekly/monthly counts, rating distribution, 8-week trend)
- [x] Industry template packs: HVAC, plumbing, roofing, auto dealer, auto repair, dentist, restaurant, gym, cleaning, general
- [x] Bulk actions for Pro (generate drafts, post selected, mark skipped, CSV export)
- [ ] Voice-match score / sample upload (deferred — not on critical path)
- [ ] Competitor snapshot (PR #8)

## Week 4 — Sales-ready launch

- [x] Public marketing site (autofivestar.com): /, /features, /pricing, /contact
- [x] Pricing page with FAQ + FAQPage schema
- [x] Free Reputation Audit tool (email-gated, demo-mode by default)
- [x] Funnel event tracking (audit_started, audit_completed, trial_clicked,
      demo_clicked, contact_clicked, audit_email_sent, etc.)
- [x] SEO: per-page metadata + OpenGraph + Twitter + canonical + FAQ schema
- [ ] PDF download (deferred — emailed HTML report covers the goal)
- [ ] Referral system (PR #9 candidate)
- [ ] CSV import for past Tweak & Build clients (PR #9 candidate)
- [ ] Outreach emails using unanswered review count (PR #9 candidate)
- [ ] Launch checklist (final PR)
