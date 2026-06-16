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
