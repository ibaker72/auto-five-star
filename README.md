# AutoFiveStar

**AI review replies for local businesses.**

AutoFiveStar connects to a local business's Google Business Profile, pulls
reviews, generates AI response drafts in the owner's voice, and lets the
owner approve and post responses to Google in seconds.

> Never leave another Google review unanswered.

## Stack

- Next.js 14 (App Router) + TypeScript strict
- Tailwind CSS + shadcn/ui
- Supabase Auth + Postgres + Storage
- Drizzle ORM (`postgres-js` driver)
- Google Business Profile API (`business.manage` scope)
- OpenAI (`gpt-4o` for generation, `gpt-4o-mini` for classification)
- Stripe Checkout / Portal / Webhooks
- Resend (email) + Twilio (SMS, Pro tier only)
- Inngest background jobs
- Upstash Redis (rate limits, queues)
- PostHog + Sentry
- Hosted on Vercel

## Project layout

```
app/                 routes (App Router)
  (app)/             authenticated app pages
  (auth)/            login/signup
  (marketing)/       public landing (week 4)
  api/               REST + webhook handlers
components/          UI components (incl. shadcn ui/)
lib/
  ai/prompts/        versioned AI prompts
  db/                drizzle schema + migrations + seed
  integrations/      typed external API clients
  inngest/           background jobs
  auth/              supabase server/client helpers
```

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in values
cp .env.example .env.local

# 3. Generate migrations from schema (already committed; only run after edits)
npm run db:generate

# 4. Apply migrations + RLS policies
npm run db:migrate
#    Then run lib/db/policies/0001_rls.sql in the Supabase SQL editor.

# 5. (Optional) Seed system templates + a demo org
npm run db:seed

# 6. Run the dev server
npm run dev
```

Open <http://localhost:3000>.

### Generate an `ENCRYPTION_KEY`

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Stripe setup

1. Create three products in **test mode** (Starter, Growth, Pro), each with
   one monthly and one yearly recurring price.
2. Add the six price IDs to `.env.local`:
   ```
   STRIPE_PRICE_STARTER_MONTHLY=price_…
   STRIPE_PRICE_STARTER_YEARLY=price_…
   STRIPE_PRICE_GROWTH_MONTHLY=price_…
   STRIPE_PRICE_GROWTH_YEARLY=price_…
   STRIPE_PRICE_PRO_MONTHLY=price_…
   STRIPE_PRICE_PRO_YEARLY=price_…
   ```
3. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and forward
   webhooks locally:
   ```bash
   stripe login
   stripe listen --forward-to http://localhost:3000/api/stripe/webhook
   ```
   Copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`.
4. In production, configure a Stripe Webhook endpoint pointed at
   `https://your-domain.com/api/stripe/webhook` and subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. In the Stripe **Billing Portal** settings, enable cancellation, plan
   changes, payment method updates, and customer-updatable email/address.

### Onboarding wizard

New users land in a 6-step wizard at `/onboarding`:

1. **Welcome** — overview, skip-for-now option
2. **Business** — confirm org name
3. **Industry** — pick from 10 packs (HVAC, plumbing, roofing, auto dealer,
   auto repair, dentist, restaurant, gym, cleaning, general). The pick
   seeds the brand voice with the pack defaults.
4. **Google** — links to `/locations` to start the GBP OAuth flow; can be
   skipped and revisited.
5. **Notifications** — email/SMS toggles + phone number
6. **Brand voice** — tone preset (professional / friendly / warm / luxury /
   direct), response length (short / medium / detailed), emoji policy,
   signature, custom notes

Progress is stored on `organizations.onboarding_step`. Completion sets
`organizations.onboarding_completed_at` and removes the "Finish setup"
badge from the app nav. Users can always reopen `/onboarding` and any step
also appears as standalone forms in `/settings`.

### Industry template packs

`lib/templates/industry-packs.ts` exposes ten packs. Each pack ships:

- Default brand voice (tone preset + response length + emoji)
- Response style guidance the AI sees verbatim
- Review-request tone (used by a future automated-request feature)
- Caution phrases (claims to avoid for this vertical)
- Alert frequency recommendations

`lib/ai/brand-voice.ts` `buildBrandVoiceInstructions` composes the pack
guidance + the org's stored brand voice into a plain-English block that
gets injected into the user message of `responseGenerator.v1`. Safe
defaults fall back to a professional medium-length voice with no emojis
and the avoid-claims rules from the prompt itself.

### Analytics

`lib/analytics/reviews.ts` `computeReviewAnalytics(orgId)` returns:

- Total reviews, average rating, posted count, response rate
- Reviews this week, this month
- Unanswered count and urgent-unanswered count (1-2 stars)
- Rating distribution (1-5)
- 8-week posting trend (count + avg rating per bucket)
- Last sync timestamp

`/dashboard` consumes this for the stats grid plus two lightweight CSS-bar
visualizations (rating distribution + trend). No additional dependencies.

### Bulk actions (Pro)

Inbox rows have selection checkboxes. The sticky bulk-actions bar at the
top of `/inbox` enables:

- **Generate drafts** — runs `generateDraftsForReview` per selection.
  Returns early on quota hit with a friendly message.
- **Post selected** — runs `postResponseToGoogle` per selection. Skips
  Yelp and reviews without a saved response.
- **Mark skipped** — flips `reviews.status` to `skipped` so they fall out
  of the unanswered queue.
- **Export CSV** — `POST /api/reviews/export` with the selected ids
  downloads a CSV (id, source, location, reviewer, rating, body, status,
  sentiment, posted_at). Max 500 rows per export, 50 per other bulk
  action.

All bulk actions go through `requireEntitlement(orgId, "actions.bulk")`,
which only Pro satisfies. Non-Pro users see a disabled bar with an
"Upgrade →" link. Single-review actions are unaffected.

### Inngest background jobs

Three functions live under `lib/inngest/functions/`:

- `pull-reviews-cron` — runs every 15 min, finds orgs with a Google
  connection AND an active/trialing subscription (or an unexpired bootstrap
  trial), and fans out one `reviews/sync.requested` event per connected
  Google location.
- `pull-reviews-for-location` — concurrency limit 5, retries 3. Calls
  `pullGoogleReviews` and emits one `reviews/new.detected` event per
  freshly inserted review id.
- `send-review-alerts` — concurrency 10, retries 2. Calls
  `processReviewAlert` which records `notifications` rows and dispatches
  email / SMS per recipient policy.

Local dev:

```bash
# Terminal 1
npm run dev

# Terminal 2
npx inngest-cli@latest dev
```

The Inngest dev UI at <http://localhost:8288> auto-discovers
`/api/inngest`. Trigger `pull-reviews-cron` from the UI to run a poll on
demand, or send a single `reviews/sync.requested` event scoped to one
location.

### Review alerts

| Rating  | Email                                | SMS                                    |
| ------- | ------------------------------------ | -------------------------------------- |
| 1–2 ★   | Immediate (all paid tiers)           | Immediate (Growth/Pro only, opted-in)  |
| 3 ★     | Queued: `daily_digest_pending`       | Never                                  |
| 4–5 ★   | Queued: `weekly_digest_pending`      | Never                                  |

Digest jobs themselves land in a later PR; for now the queued rows just
sit in the `notifications` table waiting for a worker to roll them up.

Email & SMS modes:

- `EMAIL_LIVE=false` (dev) → console-logged fixture, notification row
  marked `sent` with `_fixture: true` merged into payload.
- `EMAIL_LIVE=true` → real Resend send.
- `SMS_LIVE=false` (dev) → console-logged fixture.
- `SMS_LIVE=false` (production) → notification row marked `skipped` with
  `errorMessage="sms_disabled"`. Use this while your Twilio A2P 10DLC
  campaign is still pending.
- `SMS_LIVE=true` → real Twilio send (requires SID + auth token + from
  number).

Resend requires a verified sending domain before `EMAIL_LIVE=true` will
work in production. Twilio requires an approved A2P 10DLC campaign before
the toll-free or 10DLC number can send to US end-users.

### OpenAI / AI drafts

The AI draft generator lives in `lib/ai/generate.ts` and uses the prompt at
`lib/ai/prompts/responseGenerator.v1.ts` (versioned — bump the file name when
the schema changes).

**Modes:**
- `AI_LIVE=false` (default) + `NODE_ENV !== "production"` → returns a
  deterministic fixture (different copy for positive / neutral / negative
  sentiment), no OpenAI call, no quota cost. Perfect for local dev / CI.
- `AI_LIVE=true` → calls OpenAI with `OPENAI_MODEL_PRIMARY` (default
  `gpt-4o`), structured JSON output, retry on 429/5xx with exponential
  backoff.
- In production with `AI_LIVE !== "true"`, generation throws
  `OpenAiConfigError` — we refuse to silently fake AI for paying customers.

Quota: one generation event counts as **1** AI response in
`usage_counters.ai_responses_used` even though three variants are produced.
Starter caps at 50/month; Growth and Pro are unlimited.

### Google Business Profile setup

The GBP integration uses a separate Google OAuth client from the Supabase
Google login because Supabase's hosted provider cannot pass arbitrary scopes
like `business.manage`. They never share tokens.

**For local dev / demo** (no Google Cloud setup required):

- Leave `GBP_LIVE=false` (default).
- Clicking "Connect Google" persists an encrypted synthetic token row and
  shows fixture accounts / locations / reviews so the rest of the app is
  usable end-to-end.

**For production / live mode**:

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an **OAuth 2.0 Web Client**.
2. Set the redirect URI to
   `https://your-domain.com/api/integrations/google/callback`
   (and `http://localhost:3000/api/integrations/google/callback` for dev).
3. On the **OAuth consent screen** add the scope
   `https://www.googleapis.com/auth/business.manage` and submit the app for
   verification. While verification is pending you can add specific Google
   accounts as **test users** to grant the scope without verification.
4. Set in `.env.local`:
   ```
   GBP_LIVE=true
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=https://your-domain.com/api/integrations/google/callback
   ```
5. OAuth tokens are AES-256-GCM-encrypted with `ENCRYPTION_KEY` before they
   reach the DB (`integration_tokens.access_token_enc` /
   `refresh_token_enc`).

### Supabase Auth configuration

In the Supabase dashboard:

1. Enable **Email** provider (password sign-in).
2. Enable **Google** provider with a Google OAuth client configured for
   `openid email profile`. The Google Business Profile integration (PR #4)
   uses a separate Google OAuth client with the `business.manage` scope.
3. Set the redirect URL to
   `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback`
   in dev).

## Plans

| Plan    | Price/mo | Locations | AI responses | Sources              |
| ------- | -------- | --------- | ------------ | -------------------- |
| Starter | $49      | 1         | 50           | Google               |
| Growth  | $99      | 3         | Unlimited    | Google + Yelp (read) |
| Pro     | $199     | 10        | Unlimited    | All + API + bulk     |

14-day free trial, card required. Annual = 2 months free.

## Docs

- [`DECISIONS.md`](./DECISIONS.md) — architectural decisions log
- [`PROGRESS.md`](./PROGRESS.md) — weekly deliverables tracker
- [`.env.example`](./.env.example) — every config key

## Support

- support@autofivestar.com (placeholder)
- hello@autofivestar.com (placeholder sender)
