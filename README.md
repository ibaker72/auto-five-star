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
