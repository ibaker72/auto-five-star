# Progress

Week-by-week MVP tracker.

## Week 1 — Sign up, connect GBP, see real reviews

- [x] Repo foundation (Next.js 14, TS strict, Tailwind, shadcn/ui)
- [x] Drizzle schema (15 tables)
- [x] `.env.example`, README, DECISIONS, PROGRESS
- [ ] Supabase client/server helpers + middleware
- [ ] Migration 0001 (schema) applied
- [ ] Migration 0002 (RLS policies) applied
- [ ] Seed script
- [ ] Supabase Auth (email + Google login)
- [ ] Org creation on signup + Stripe customer creation
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
