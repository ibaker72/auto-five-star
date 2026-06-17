# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into AutoFiveStar. A new server-side PostHog client (`lib/posthog.ts`) was created using the `posthog-node` SDK. Event tracking was added across auth, onboarding, location management, review response workflows, Stripe billing, and bulk inbox actions. User identification (`posthog.identify`) is called at login, signup, and the OAuth callback. Exception tracking (`posthog.captureException`) was added to the auth callback error handler.

| Event name | Description | File |
|---|---|---|
| `user_signed_up` | Fired when a user completes email/password signup, or when Google OAuth creates a new account. | `app/(auth)/actions.ts`, `app/auth/callback/route.ts` |
| `user_logged_in` | Fired when a user successfully logs in with email/password or Google OAuth. | `app/(auth)/actions.ts`, `app/auth/callback/route.ts` |
| `onboarding_completed` | Fired when a user finishes the last onboarding step (brand voice) and is redirected to dashboard. | `app/(onboarding)/onboarding/actions.ts` |
| `google_location_connected` | Fired when a Google Business Profile location is successfully connected to an org. | `app/(app)/locations/actions.ts` |
| `reviews_pulled` | Fired when reviews are manually pulled from Google for a location. | `app/(app)/locations/actions.ts` |
| `google_disconnected` | Fired when Google integration is disconnected from an org. | `app/(app)/locations/actions.ts` |
| `ai_drafts_generated` | Fired when AI response drafts are generated for a single review. | `app/(app)/reviews/[id]/actions.ts` |
| `response_approved` | Fired when a review response is moved to approved status. | `app/(app)/reviews/[id]/actions.ts` |
| `response_posted_to_google` | Fired when a review response is successfully posted to Google. | `app/(app)/reviews/[id]/actions.ts` |
| `subscription_checkout_started` | Fired when a Stripe checkout session is created (user initiates plan upgrade). | `app/api/stripe/checkout/route.ts` |
| `subscription_activated` | Fired when a Stripe `checkout.session.completed` webhook is received. | `lib/billing/webhook-events.ts` |
| `subscription_canceled` | Fired when a Stripe `customer.subscription.deleted` webhook is received. | `lib/billing/webhook-events.ts` |
| `bulk_drafts_generated` | Fired when AI drafts are bulk-generated for multiple reviews from the inbox. | `app/(app)/inbox/actions.ts` |
| `bulk_responses_posted` | Fired when approved responses are bulk-posted to Google from the inbox. | `app/(app)/inbox/actions.ts` |

## Next steps

We've built insights and a dashboard to monitor key user behaviors based on the events instrumented above:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/474591/dashboard/1725289)
- [New signups over time](https://us.posthog.com/project/474591/insights/1vfjpZ7t)
- [User activation funnel: signup → onboarding → location connected](https://us.posthog.com/project/474591/insights/B5t0ehir)
- [Subscription checkout → activation funnel](https://us.posthog.com/project/474591/insights/MaUeZXOf)
- [Responses posted to Google](https://us.posthog.com/project/474591/insights/jKvisSUJ)
- [Subscription cancellations](https://us.posthog.com/project/474591/insights/XkyKZFtm)

## Verify before merging

- [ ] Run a full production build (`npm run build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — the auth callback identifies on every OAuth return, but password login only identifies on success. Verify returning password-login sessions pick up the correct distinct ID.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-javascript_node/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
