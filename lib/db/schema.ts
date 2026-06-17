import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const planEnum = pgEnum("plan", ["starter", "growth", "pro"]);
export const orgRoleEnum = pgEnum("org_role", ["owner", "admin", "member"]);
export const reviewSourceEnum = pgEnum("review_source", ["google", "yelp"]);
export const reviewStatusEnum = pgEnum("review_status", [
  "new",
  "drafted",
  "approved",
  "posted",
  "skipped",
  "flagged",
]);
export const responseStatusEnum = pgEnum("response_status", [
  "draft",
  "approved",
  "posted",
  "failed",
]);
export const draftVariantEnum = pgEnum("draft_variant", [
  "warm",
  "professional",
  "brief",
]);
export const sentimentEnum = pgEnum("sentiment", [
  "positive",
  "neutral",
  "negative",
]);
export const integrationProviderEnum = pgEnum("integration_provider", [
  "google",
  "yelp",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
]);
export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "sms",
  "in_app",
]);
export const notificationStatusEnum = pgEnum("notification_status", [
  "queued",
  "sent",
  "failed",
  "skipped",
]);

const ts = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// users  (mirrors supabase.auth.users by id)
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  notificationPhone: text("notification_phone"),
  alertsEmailEnabled: boolean("alerts_email_enabled").notNull().default(true),
  alertsSmsEnabled: boolean("alerts_sms_enabled").notNull().default(false),
  ...ts(),
});

// ---------------------------------------------------------------------------
// organizations
// ---------------------------------------------------------------------------
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    industry: text("industry"),
    plan: planEnum("plan").notNull().default("starter"),
    stripeCustomerId: text("stripe_customer_id"),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    onboardingStep: text("onboarding_step"),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true,
    }),
    ...ts(),
  },
  (t) => ({
    slugIdx: uniqueIndex("organizations_slug_idx").on(t.slug),
    stripeCustomerIdx: uniqueIndex("organizations_stripe_customer_idx").on(
      t.stripeCustomerId,
    ),
  }),
);

// ---------------------------------------------------------------------------
// org_members
// ---------------------------------------------------------------------------
export const orgMembers = pgTable(
  "org_members",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: orgRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.orgId, t.userId] }),
    userIdx: index("org_members_user_idx").on(t.userId),
  }),
);

// ---------------------------------------------------------------------------
// locations
// ---------------------------------------------------------------------------
export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    source: reviewSourceEnum("source").notNull(),
    sourceLocationId: text("source_location_id").notNull(),
    name: text("name").notNull(),
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    countryCode: text("country_code").default("US"),
    phone: text("phone"),
    websiteUrl: text("website_url"),
    gbpAccountId: text("gbp_account_id"),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    ...ts(),
  },
  (t) => ({
    sourceUniq: uniqueIndex("locations_source_uniq").on(
      t.source,
      t.sourceLocationId,
    ),
    orgIdx: index("locations_org_idx").on(t.orgId),
  }),
);

// ---------------------------------------------------------------------------
// reviews
// ---------------------------------------------------------------------------
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    source: reviewSourceEnum("source").notNull(),
    sourceReviewId: text("source_review_id").notNull(),
    reviewerName: text("reviewer_name"),
    reviewerAvatarUrl: text("reviewer_avatar_url"),
    rating: integer("rating").notNull(),
    body: text("body"),
    language: text("language").default("en"),
    postedAt: timestamp("posted_at", { withTimezone: true }).notNull(),
    status: reviewStatusEnum("status").notNull().default("new"),
    sentiment: sentimentEnum("sentiment"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...ts(),
  },
  (t) => ({
    sourceUniq: uniqueIndex("reviews_source_uniq").on(
      t.source,
      t.sourceReviewId,
    ),
    orgStatusPosted: index("reviews_org_status_posted_idx").on(
      t.orgId,
      t.status,
      t.postedAt,
    ),
    locationIdx: index("reviews_location_idx").on(t.locationId),
  }),
);

// ---------------------------------------------------------------------------
// response_drafts  (AI-generated)
// ---------------------------------------------------------------------------
export const responseDrafts = pgTable(
  "response_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    variant: draftVariantEnum("variant").notNull(),
    body: text("body").notNull(),
    rationale: text("rationale"),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    tokensInput: integer("tokens_input").default(0),
    tokensOutput: integer("tokens_output").default(0),
    costCents: integer("cost_cents").default(0),
    sentiment: sentimentEnum("sentiment"),
    flags: jsonb("flags").$type<string[]>().default(sql`'[]'::jsonb`),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...ts(),
  },
  (t) => ({
    reviewIdx: index("response_drafts_review_idx").on(t.reviewId),
    orgIdx: index("response_drafts_org_idx").on(t.orgId),
  }),
);

// ---------------------------------------------------------------------------
// review_responses  (what was actually approved/posted, AI or hand-written)
// ---------------------------------------------------------------------------
export const reviewResponses = pgTable(
  "review_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    draftId: uuid("draft_id").references(() => responseDrafts.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    status: responseStatusEnum("status").notNull().default("draft"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    postedByUserId: uuid("posted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sourceResponseId: text("source_response_id"),
    errorMessage: text("error_message"),
    ...ts(),
  },
  (t) => ({
    reviewIdx: index("review_responses_review_idx").on(t.reviewId),
    orgIdx: index("review_responses_org_idx").on(t.orgId),
  }),
);

// ---------------------------------------------------------------------------
// templates  (industry packs + user-saved snippets)
// ---------------------------------------------------------------------------
export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizations.id, {
      onDelete: "cascade",
    }), // nullable = global/system template
    industry: text("industry"),
    name: text("name").notNull(),
    body: text("body").notNull(),
    tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
    isSystem: boolean("is_system").notNull().default(false),
    ...ts(),
  },
  (t) => ({
    orgIdx: index("templates_org_idx").on(t.orgId),
  }),
);

// ---------------------------------------------------------------------------
// brand_voices  (one per org)
// ---------------------------------------------------------------------------
export const brandVoices = pgTable(
  "brand_voices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    toneFormal: integer("tone_formal").notNull().default(50),
    toneWarm: integer("tone_warm").notNull().default(70),
    toneBrevity: integer("tone_brevity").notNull().default(50),
    samples: jsonb("samples").$type<string[]>().default(sql`'[]'::jsonb`),
    voiceSignature: text("voice_signature"),
    tonePreset: text("tone_preset"),
    responseLength: text("response_length"),
    emojiAllowed: boolean("emoji_allowed").notNull().default(false),
    customNotes: text("custom_notes"),
    industryPack: text("industry_pack"),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...ts(),
  },
  (t) => ({
    orgUniq: uniqueIndex("brand_voices_org_uniq").on(t.orgId),
  }),
);

// ---------------------------------------------------------------------------
// subscriptions  (mirrors Stripe)
// ---------------------------------------------------------------------------
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    stripePriceId: text("stripe_price_id").notNull(),
    plan: planEnum("plan").notNull(),
    status: subscriptionStatusEnum("status").notNull(),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    trialEnd: timestamp("trial_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    ...ts(),
  },
  (t) => ({
    stripeUniq: uniqueIndex("subscriptions_stripe_uniq").on(
      t.stripeSubscriptionId,
    ),
    orgIdx: index("subscriptions_org_idx").on(t.orgId),
  }),
);

// ---------------------------------------------------------------------------
// usage_counters  (monthly buckets per org)
// ---------------------------------------------------------------------------
export const usageCounters = pgTable(
  "usage_counters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    aiResponsesUsed: integer("ai_responses_used").notNull().default(0),
    aiCostCents: integer("ai_cost_cents").notNull().default(0),
    reviewsPulled: integer("reviews_pulled").notNull().default(0),
    ...ts(),
  },
  (t) => ({
    orgPeriodUniq: uniqueIndex("usage_counters_org_period_uniq").on(
      t.orgId,
      t.periodStart,
    ),
  }),
);

// ---------------------------------------------------------------------------
// audit_logs  (append-only)
// ---------------------------------------------------------------------------
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(), // e.g. "review.posted", "draft.generated"
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orgCreatedIdx: index("audit_logs_org_created_idx").on(t.orgId, t.createdAt),
  }),
);

// ---------------------------------------------------------------------------
// integration_tokens  (encrypted at rest)
// ---------------------------------------------------------------------------
export const integrationTokens = pgTable(
  "integration_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").notNull(),
    accountEmail: text("account_email"),
    accessTokenEnc: text("access_token_enc").notNull(),
    refreshTokenEnc: text("refresh_token_enc"),
    scope: text("scope"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...ts(),
  },
  (t) => ({
    orgProviderUniq: uniqueIndex("integration_tokens_org_provider_uniq").on(
      t.orgId,
      t.provider,
    ),
  }),
);

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    channel: notificationChannelEnum("channel").notNull(),
    event: text("event").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
    status: notificationStatusEnum("status").notNull().default("queued"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    ...ts(),
  },
  (t) => ({
    orgIdx: index("notifications_org_idx").on(t.orgId),
  }),
);

// ---------------------------------------------------------------------------
// competitor_snapshots
// ---------------------------------------------------------------------------
export const competitorSnapshots = pgTable(
  "competitor_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    ...ts(),
  },
  (t) => ({
    orgIdx: index("competitor_snapshots_org_idx").on(t.orgId),
    locationCapturedIdx: index("competitor_snapshots_loc_idx").on(
      t.locationId,
      t.capturedAt,
    ),
  }),
);

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrgMember = typeof orgMembers.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type ResponseDraft = typeof responseDrafts.$inferSelect;
export type NewResponseDraft = typeof responseDrafts.$inferInsert;
export type ReviewResponse = typeof reviewResponses.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type BrandVoice = typeof brandVoices.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type UsageCounter = typeof usageCounters.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type IntegrationToken = typeof integrationTokens.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type CompetitorSnapshot = typeof competitorSnapshots.$inferSelect;
