import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  organizations,
  orgMembers,
  brandVoices,
  usageCounters,
  users,
  type Organization,
} from "@/lib/db/schema";
import { createCustomer } from "@/lib/integrations/stripe";
import { writeAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { getCurrentUserPrimaryOrg } from "./org";

export type BootstrapInput = {
  userId: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
};

export type BootstrapResult = {
  user: { id: string; email: string };
  org: Organization;
  isNewOrg: boolean;
};

/**
 * Bootstrap a freshly authenticated user.
 *
 * Idempotent: safe to call on every request. On first call it creates the
 * user row, a personal organization, an owner membership, a Stripe customer,
 * a default brand voice, and an initial usage counter. On subsequent calls
 * it just returns the existing org. Stripe customer creation is retried
 * lazily if it failed on the initial bootstrap (stripe_customer_id null).
 */
export async function bootstrapUserOrg(
  input: BootstrapInput,
): Promise<BootstrapResult> {
  const { userId, email } = input;

  // 1. Upsert user row (mirrors auth.users by id).
  await db
    .insert(users)
    .values({
      id: userId,
      email,
      fullName: input.fullName ?? null,
      avatarUrl: input.avatarUrl ?? null,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        fullName: sql`coalesce(excluded.full_name, ${users.fullName})`,
        avatarUrl: sql`coalesce(excluded.avatar_url, ${users.avatarUrl})`,
        updatedAt: new Date(),
      },
    });

  // 2. If user already belongs to an org, ensure Stripe customer exists, return it.
  const existing = await getCurrentUserPrimaryOrg(userId);
  if (existing) {
    const org = await ensureStripeCustomer({
      org: existing.org,
      email,
      userId,
    });
    return {
      user: { id: userId, email },
      org,
      isNewOrg: false,
    };
  }

  // 3. Otherwise, create org + membership + brand voice + usage counter + Stripe customer.
  const baseName = input.fullName
    ? `${input.fullName}'s Org`
    : `${(email.split("@")[0] ?? "my").trim()}'s Org`;
  const slug = await uniqueOrgSlug(email);

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const inserted = await db
    .insert(organizations)
    .values({
      name: baseName,
      slug,
      plan: "starter",
      trialEndsAt,
      createdByUserId: userId,
    })
    .returning();

  const org = inserted[0];
  if (!org) throw new Error("Failed to create organization");

  await db.insert(orgMembers).values({
    orgId: org.id,
    userId,
    role: "owner",
  });

  await db
    .insert(brandVoices)
    .values({
      orgId: org.id,
      toneFormal: 50,
      toneWarm: 70,
      toneBrevity: 50,
      samples: [],
      updatedByUserId: userId,
    })
    .onConflictDoNothing();

  await ensureCurrentUsageCounter(org.id);

  // Audit before Stripe so we still log even if Stripe is misconfigured.
  await writeAudit({
    orgId: org.id,
    actorUserId: userId,
    action: "org.created",
    targetType: "organization",
    targetId: org.id,
    metadata: { source: "bootstrap" },
  });

  const orgWithStripe = await ensureStripeCustomer({ org, email, userId });

  return {
    user: { id: userId, email },
    org: orgWithStripe,
    isNewOrg: true,
  };
}

async function ensureStripeCustomer(args: {
  org: Organization;
  email: string;
  userId: string;
}): Promise<Organization> {
  if (args.org.stripeCustomerId) return args.org;

  try {
    const customer = await createCustomer({
      email: args.email,
      orgId: args.org.id,
      name: args.org.name,
    });
    const updated = await db
      .update(organizations)
      .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
      .where(eq(organizations.id, args.org.id))
      .returning();
    return updated[0] ?? args.org;
  } catch (err) {
    // Don't crash bootstrap if Stripe is down or misconfigured locally; we'll
    // retry on the next call (stripe_customer_id stays null).
    console.error("[bootstrap] stripe customer creation failed", err);
    return args.org;
  }
}

async function ensureCurrentUsageCounter(orgId: string): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  await db
    .insert(usageCounters)
    .values({
      orgId,
      periodStart,
      periodEnd,
      aiResponsesUsed: 0,
      aiCostCents: 0,
      reviewsPulled: 0,
    })
    .onConflictDoNothing();
}

async function uniqueOrgSlug(email: string): Promise<string> {
  const base = slugify((email.split("@")[0] ?? "org").slice(0, 30)) || "org";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate =
      attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const existing = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
