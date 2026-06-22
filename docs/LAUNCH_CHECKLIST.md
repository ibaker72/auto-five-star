# Launch Readiness Checklist

Internal QA reference for taking AutoFiveStar live for real prospects and
customers. Keep this honest — if something here is not yet true in production,
the app copy should not claim it is.

Last reviewed: 2026-06-22

---

## 1. Required environment variables

These must be set in the production environment (Vercel) before launch.

### Core (app cannot run without these)

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public base URL (e.g. `https://www.autofivestar.com`) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client auth |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_JWT_SECRET` | Server-side Supabase |
| `DATABASE_URL` / `DIRECT_URL` | Drizzle (pooled runtime + direct for migrations) |
| `ENCRYPTION_KEY` | 32-byte hex; encrypts stored OAuth tokens |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` + the six `STRIPE_PRICE_*` IDs | Billing |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Background jobs (review pull, drip, follow-up) |

### Feature-gated (have a `*_LIVE` flag — default to fixture/preview until ready)

| Var(s) | Flag | When `false` |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | `GBP_LIVE` | Google Business Profile runs in preview mode with example data |
| `GOOGLE_PLACES_API_KEY` | _(none)_ | Free audit falls back to a clearly labeled sample preview |
| `OPENAI_API_KEY` / `OPENAI_MODEL_PRIMARY` / `OPENAI_MODEL_CLASSIFIER` | `AI_LIVE` | AI drafts return a deterministic fixture (non-prod only) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | `EMAIL_LIVE` | Emails are fixture-sent (logged, marked `fixture:true`) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | `SMS_LIVE` | SMS is fixture-sent in dev, skipped (held) in prod |
| `YELP_API_KEY` | _(none)_ | Yelp read returns a single demo review |

### Admin / ops

| Var | Purpose |
| --- | --- |
| `ADMIN_EMAILS` | Comma-separated allowlist for `/admin/*`. Unset = admin pages 404 |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Rate limits + queues |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_SENTRY_DSN` (+ Sentry build vars) | Analytics + error tracking |

See `.env.example` for the full annotated list.

---

## 2. Production E2E test steps

Run the live audit funnel against production using the internal admin tool.

1. Make sure your email is in `ADMIN_EMAILS` and you're signed in.
2. Go to **`/admin/audit-tests`**.
3. Enter a **real** business name + city (so Google Places can match it) and a
   test email you control. The tool auto-prefixes the saved lead with
   `E2E Test —` so it is unmistakably test data.
4. Click **Run test audit** and confirm the checklist:
   - Audit lead created — PASS
   - Audit payload stored — PASS
   - Google Places data captured — PASS (SKIP if no key / no match)
   - Result page URL generated — PASS
   - PDF URL generated — PASS
   - PDF route returns 200 — PASS
   - Immediate email — PASS / SKIP (fixture) / FAIL (see pending items below)
   - Inngest follow-up dispatched — PASS
   - Funnel events recorded — PASS
5. Open the **Results page** and **PDF** links and eyeball them.
6. **Clean up** when done (see section 4).

A SKIP on Google Places means no key was set or no match was found — the lead
still completes in sample mode.

---

## 3. Known external setup still pending

These are infrastructure/approval items outside the codebase. The app already
degrades gracefully and reports each state honestly in the UI.

- [ ] **Resend domain verification** — verify `autofivestar.com` DNS in Resend,
  then set `EMAIL_LIVE=true`. Until then immediate audit emails fail (reported
  clearly in the E2E checklist) and review-request emails are held.
- [ ] **Google Business Profile API access** — submit the `business.manage`
  access request. Quota stays 0 until Google approves; set `GBP_LIVE=true`
  once granted. Until then GBP shows preview data and posting is simulated.
- [ ] **Twilio A2P 10DLC** — register the campaign/number, then set
  `SMS_LIVE=true`. Until then SMS alerts and SMS review requests are held
  (skipped), and email continues to cover alerts.
- [ ] **Yelp Fusion key** — set `YELP_API_KEY` to replace the demo review with
  live read-only data (read-only; posting to Yelp is intentionally disabled).

---

## 4. How to clean up test leads

The admin E2E tool only ever creates leads prefixed with `E2E Test —`, and
cleanup refuses to touch anything without that prefix (`assertCleanableTestLead`
throws otherwise — see `lib/audit/e2e-core.ts`).

- **From the UI:** after a run, click **Delete this test lead** on the results
  card and confirm. This removes the lead, its audit requests, and its funnel
  events (all strictly scoped to that lead id).
- **Safety guarantees:**
  - A real captured lead can never be deleted by this tool (no prefix → throw).
  - Deletes are scoped by lead id and its own audit-request ids only — never a
    blanket delete.
  - Real production audits from the public funnel are unaffected.

---

## 5. Pre-launch verification (run locally / in CI)

```bash
npm test          # unit + integration suite
npm run typecheck # tsc --noEmit
npm run lint      # eslint
npm run build     # production build
```

All four must pass before shipping.
