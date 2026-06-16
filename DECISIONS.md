# Architectural Decisions

A running log of non-obvious choices. Each entry: date, decision, rationale,
alternatives considered.

---

## 2026-06-16 — Inngest over Trigger.dev for background jobs

**Decision:** Use Inngest.

**Rationale:** Simpler local dev (`inngest-cli dev`), Vercel-native serverless
function deployment, no separate dashboard service or worker container needed
for the MVP. Cron + event-driven steps cover review polling, draft generation,
and email/SMS dispatch.

**Alternatives:** Trigger.dev (more powerful but more setup), raw Vercel Cron
(no retries/idempotency primitives).

---

## 2026-06-16 — Drizzle + `postgres-js` over Supabase client for data layer

**Decision:** Use Drizzle with the `postgres-js` driver against the Supabase
Postgres connection string. RLS policies authored as raw SQL in
`lib/db/migrations/` alongside schema migrations.

**Rationale:** Type-safe SQL, schema-as-code, migrations in repo. Supabase
client is still used for Auth and Storage; data reads/writes go through
Drizzle to keep types tight.

**Alternatives:** Supabase JS client only (loses type safety), Prisma
(slower codegen, heavier runtime).

---

## 2026-06-16 — Separate Google OAuth client for GBP, distinct from Supabase Google login

**Decision:** Two separate Google OAuth clients:

1. Supabase Auth — `openid email profile` scope, login only.
2. AutoFiveStar Google client — `https://www.googleapis.com/auth/business.manage`
   scope, stored in `integration_tokens` (encrypted), used by the GBP integration.

**Rationale:** Supabase's hosted Google provider does not allow passing
arbitrary scopes like `business.manage`. Mixing scopes also makes it impossible
to revoke GBP access without logging the user out.

**Alternatives:** Use Supabase OAuth with extended scopes (not supported
cleanly); single client with all scopes (logout/revoke coupling).

---

## 2026-06-16 — `GBP_LIVE` feature flag

**Decision:** Add `GBP_LIVE` env flag. When `false`, the Google integration
client returns fixture data. When `true`, it hits the live GBP API.

**Rationale:** Google requires manual approval of the `business.manage` scope
for production OAuth clients (weeks of lead time including a security review).
We can build, demo, and seed against fixtures while approval is pending without
forking the codebase.

**Alternatives:** Wait for approval before building (blocks the 30-day MVP);
maintain a parallel mock module (drift risk).

---

## 2026-06-16 — AES-256-GCM for OAuth token encryption at rest

**Decision:** Encrypt `access_token` and `refresh_token` with AES-256-GCM
using a 32-byte `ENCRYPTION_KEY` env var. Store ciphertext + IV + auth tag in
`integration_tokens`.

**Rationale:** Standard authenticated encryption, available in Node's
`crypto` module. Key is supplied at runtime via env, never committed.

**Alternatives:** Supabase Vault (extra dependency, slower for hot path),
plaintext (unacceptable).

---

## 2026-06-16 — Money in cents, integers

**Decision:** Every monetary value (plan prices, AI cost, MRR) is stored as
`integer` cents.

**Rationale:** No float drift, matches Stripe's wire format.

---

## 2026-06-16 — Webhook is the source of truth for subscription state

**Decision:** `/api/stripe/checkout` only creates the Checkout Session. The
`subscriptions` row, `organizations.plan`, `organizations.trial_ends_at`, and
the current-month `usage_counters` row are all written by the webhook handler
in response to Stripe events.

**Rationale:** Removes a class of bugs where the UI thinks the user is on
Growth but Stripe hasn't actually started the subscription. The webhook is
also retried by Stripe on 5xx, so state converges to whatever Stripe knows.

**Implementation:**
- Webhook signature verified with `STRIPE_WEBHOOK_SECRET` against the raw
  body (Node runtime route).
- Event-level dedup via Upstash Redis `SETNX` with a 24h TTL. If Redis is
  unavailable we fail open — the per-event handlers are idempotent (Drizzle
  upsert by `stripe_subscription_id` unique index).
- On `customer.subscription.deleted` and `incomplete_expired`, org plan
  degrades to "starter" so entitlements clean up automatically.
- `organizations.stripe_customer_id` is only filled by the webhook when the
  column is NULL — never overwritten.

**Alternatives:** Trust the Checkout Session redirect query string (race
condition before webhook arrives, easy to spoof).

---

## 2026-06-16 — Calendar-month usage buckets regardless of billing interval

**Decision:** `usage_counters` is keyed by calendar month, not by
subscription billing period. Annual subscribers still get a fresh quota each
calendar month.

**Rationale:** Quota is "50 AI responses per month" — that's a per-month
metric. Tying it to Stripe billing periods would mean annual subscribers
either get 1 quota for a year or we'd have to fabricate monthly sub-periods.

**Implementation:** `usageCounters` has a unique index on
`(org_id, period_start)`. Bootstrap and webhook handlers both call
`ensureCurrentUsageCounter()` which `INSERT … ON CONFLICT DO NOTHING`. Quota
checks use `gte(period_start, currentMonthStart)`.

---

## 2026-06-16 — Two-hop Inngest fan-out for review polling

**Decision:** The 15-minute cron only emits `reviews/sync.requested` events
per eligible (org, location). The actual GBP fetch lives in a separate
`pullReviewsForLocation` function with `concurrency: { limit: 5 }` and 3
retries. When that function detects new reviews, it emits
`reviews/new.detected` events that drive `sendReviewAlerts` (concurrency: 10,
2 retries).

**Rationale:** One big function for "iterate all orgs" would hit serverless
timeouts as the customer base grows and would force the whole batch to retry
on a single failure. Per-location functions are independently retryable and
can be back-pressured without affecting other tenants. Alerts are also
isolated: a flaky Twilio call doesn't block a Resend send.

---

## 2026-06-16 — Negative reviews send now; 3/4/5-star queue digest-pending rows

**Decision:** 1–2 star reviews trigger an email immediately (and SMS for
Growth/Pro when consented). 3-star reviews queue a `daily_digest_pending`
notification row, 4–5 star reviews queue `weekly_digest_pending`. The
digest jobs themselves are out of scope for PR #6 — the rows just sit in
the queue.

**Rationale:** Owners want to react fast to negative reviews; positive
reviews are batchable and inbox-noise if sent one-at-a-time. Recording the
intent now (one row per review per recipient) means the future digest job
is a simple "select queued rows since last digest" — no replay of polling
required.

---

## 2026-06-16 — `EMAIL_LIVE` and `SMS_LIVE` mirror `AI_LIVE` semantics

**Decision:** Added `EMAIL_LIVE` and `SMS_LIVE` env flags. In dev with the
flag false, sending is replaced with a console-logged fixture and the
`notifications.status` is set to `sent` with a `fixture: true` flag merged
into the payload via JSONB concat. In production with the flag false, we
deliberately mark the notification `skipped` (with `errorMessage="sms_disabled"`
for SMS) rather than throwing — letting operators ship the app before Resend
domain verification or Twilio A2P approval lands without flooding error logs.

**Rationale:** Both providers have multi-week onboarding (Resend domain
verification, Twilio A2P 10DLC campaign). Without a skip path we'd block
launch on either step.

---

## 2026-06-16 — Notification phone lives on `users`, not a separate profile table

**Decision:** Added three columns to `users`: `notification_phone` (text,
nullable), `alerts_email_enabled` (bool, default true), `alerts_sms_enabled`
(bool, default false). Settings UI writes to these directly.

**Rationale:** A separate `user_profiles` table is the right call once
notification preferences fan out across multiple channels and per-org
overrides. For the MVP, the user is the unit — one phone, one email opt-in,
one SMS opt-in. We accept the column count cost.

---

## 2026-06-16 — Delete-then-insert for AI draft regeneration

**Decision:** When the user requests a regenerate, we DELETE the prior batch
of `response_drafts` for the review and INSERT a fresh batch in the same
function. The audit log records every generation event so history is
preserved without versioning columns on the table.

**Rationale:** The UI only ever shows the latest variant set. Versioning
would mean a `version` column, dedup queries on every read, and an explicit
"go back to v2" UX we don't need. Deleting old drafts is safe because the
user's chosen text already lives on `review_responses` once they hit Save.

**Implementation:** `lib/ai/generate.ts` `generateDraftsForReview` takes a
`force` flag. Without force, returns cached drafts (one OpenAI call avoided).
With force, deletes old rows then inserts the new batch and audits with
`forced: true`.

---

## 2026-06-16 — One generation event = 1 AI quota usage

**Decision:** Producing three variants for a single review counts as **one**
AI response in `usage_counters.ai_responses_used`. Saving, editing, approving,
and posting do not increment usage.

**Rationale:** The user-facing promise is "50 AI responses per month" — the
variants are an implementation detail. Charging three quota units per review
would hit the Starter cap after 17 reviews instead of 50.

**Implementation:** `incrementAiUsage(orgId, 1, totalCostCents)` is called
once per OpenAI round-trip. The 3 variant rows record their per-variant token
share for accounting clarity, but quota is bumped by 1.

---

## 2026-06-16 — `AI_LIVE` flag mirrors `GBP_LIVE`

**Decision:** Added an `AI_LIVE` env flag with the same semantics as
`GBP_LIVE`. When `false` and `NODE_ENV !== "production"`, OpenAI is replaced
with a deterministic fixture (different copy for positive / neutral /
negative). In production we refuse to fall back: an explicit
`OpenAiConfigError` is thrown.

**Rationale:** Lets contributors and CI exercise the full pipeline without
an `OPENAI_API_KEY`, but never silently fakes responses in front of a
paying customer.

---

## 2026-06-16 — Posting is one click: approve-and-post when needed

**Decision:** The "Post to Google" button accepts a saved draft regardless
of `review_responses.status`. If the row is still `draft`, posting promotes
it through `posted`. There is no required "Approve first, then post" sequence.

**Rationale:** Owners told us the extra click felt bureaucratic. Approve
still exists as a separate action for reviewers who want a pause; posting
just doesn't require it.

---

## 2026-06-16 — HMAC-signed OAuth state, no server-side state store

**Decision:** OAuth state for the GBP flow is a base64url-encoded JSON payload
`{intent, orgId, userId, nonce, exp}` signed with HMAC-SHA256 using
`ENCRYPTION_KEY`. The callback verifies the signature and that `exp` is in
the future before trusting it.

**Rationale:** No Redis/DB round-trip for state. Tamper-proof. 10-minute TTL
bounds replay window. Self-contained so it survives serverless cold starts.

**Implementation:** `lib/oauth/state.ts` `signOAuthState` / `verifyOAuthState`.
Callback also cross-checks the Supabase session user matches `state.userId`
as defense in depth against CSRF + session-fixation combos.

---

## 2026-06-16 — `GBP_LIVE=false` skips the Google round-trip entirely

**Decision:** In fixture mode, `/api/integrations/google/connect` does not
redirect to Google at all — it directly writes an encrypted synthetic token
row and redirects to `/locations?google=connected`.

**Rationale:** Until `business.manage` is approved on the production OAuth
client, going through Google would fail for anyone who isn't a test user. The
fixture-mode shortcut keeps the local/demo path one click long, while
`GBP_LIVE=true` exercises the real OAuth flow once approval lands.

**Implementation:** `GOOGLE_CLIENT_ID` becomes optional when
`GBP_LIVE=false`. Tokens stored in `integration_tokens` are still encrypted
so the dev path exercises the at-rest crypto too.

---

## 2026-06-16 — Unique `(org_id, provider)` on `integration_tokens`

**Decision:** Added a unique index on `(org_id, provider)` so that
`saveGoogleTokens` can use `ON CONFLICT DO UPDATE` to refresh credentials
on reconnect.

**Rationale:** The MVP only supports one connection per provider per org.
Multiple Google accounts per org is a Pro-tier story that would need agency
mode and isn't on the 30-day plan.

**Migration:** `lib/db/migrations/0001_fat_randall.sql` drops the previous
non-unique index and replaces it with `integration_tokens_org_provider_uniq`.

---

## 2026-06-16 — Idempotent bootstrap on every authed entry point

**Decision:** `bootstrapUserOrg()` is called from both `/auth/callback` and the
`(app)` layout. It upserts the user row, creates an org/membership/brand
voice/usage counter/Stripe customer on first call, and is a no-op on subsequent
calls.

**Rationale:** Users can land in the app via three paths — fresh signup, email
confirmation link, or returning login. Centralizing the setup in one
idempotent function means we never end up with a "logged in but no org" zombie
state, regardless of where Supabase drops the user.

**Alternatives:** Force users to a separate `/setup` route (extra hop, confuses
SSO returns), database trigger on `auth.users` insert (works but harder to
debug and couples app logic to DB triggers).

---

## 2026-06-16 — Stripe customer creation is non-fatal during bootstrap

**Decision:** If Stripe customer creation fails during bootstrap, the org is
still created and `stripe_customer_id` stays `null`. The next call to
`bootstrapUserOrg()` retries the Stripe call.

**Rationale:** Stripe outages or missing dev keys should not block account
creation. The retry-on-next-call pattern is simpler than a background job for
this single side-effect.

---

## 2026-06-16 — Review identity = `(source, source_review_id)`

**Decision:** Reviews are deduplicated by `(source, source_review_id)` unique
index. The 15-min poller upserts by this key.

**Rationale:** Both Google and Yelp expose stable review IDs. Idempotent
upserts let the poller be retried freely without dupes.
