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

## 2026-06-16 — Review identity = `(source, source_review_id)`

**Decision:** Reviews are deduplicated by `(source, source_review_id)` unique
index. The 15-min poller upserts by this key.

**Rationale:** Both Google and Yelp expose stable review IDs. Idempotent
upserts let the poller be retried freely without dupes.
