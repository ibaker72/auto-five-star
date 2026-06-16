/**
 * Seed a demo organization with a few reviews so the dashboard has data
 * during development. Idempotent: re-running upserts by slug.
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import {
  organizations,
  locations,
  reviews,
  templates,
} from "./schema";

const INDUSTRY_TEMPLATES: Array<{
  industry: string;
  name: string;
  body: string;
  tags: string[];
}> = [
  {
    industry: "hvac",
    name: "HVAC — 5-star thank you",
    body: "Thanks so much, {{first_name}}! We're glad {{technician_name}} got your system back up and running quickly. We appreciate the kind words and look forward to keeping you comfortable next season.",
    tags: ["5-star", "thank-you"],
  },
  {
    industry: "hvac",
    name: "HVAC — late arrival apology",
    body: "We're truly sorry we ran behind, {{first_name}}. That's not the experience we want for our customers. We'd like to make it right — please give us a call at the office so we can follow up directly.",
    tags: ["1-star", "2-star", "apology"],
  },
  {
    industry: "dental",
    name: "Dental — friendly 5-star",
    body: "Thank you, {{first_name}}! It means a lot to hear that the team made your visit comfortable. We'll be ready when it's time for your next cleaning.",
    tags: ["5-star", "thank-you"],
  },
  {
    industry: "restaurant",
    name: "Restaurant — generic positive",
    body: "Thanks for the kind words, {{first_name}}! We're so glad you enjoyed your meal. Looking forward to having you back soon.",
    tags: ["5-star", "thank-you"],
  },
  {
    industry: "landscaping",
    name: "Landscaping — repeat-customer ask",
    body: "We appreciate it, {{first_name}}! Whenever you're ready for the next visit, just give us a shout. Thanks for trusting our team with your yard.",
    tags: ["5-star", "retention"],
  },
  {
    industry: "moving",
    name: "Moving — empathy + invitation",
    body: "Thanks for the feedback, {{first_name}}. Moving day is stressful and we always want to do better. If you have a minute, we'd love to hear how we can improve — email us anytime.",
    tags: ["3-star", "constructive"],
  },
  {
    industry: "auto_repair",
    name: "Auto repair — 5-star reinforce",
    body: "Thanks, {{first_name}}! We're glad we could get you back on the road quickly. We appreciate the trust and look forward to seeing you next service.",
    tags: ["5-star", "thank-you"],
  },
  {
    industry: "real_estate",
    name: "Real estate — closing thank you",
    body: "Congratulations again, {{first_name}}! It was a pleasure helping you through the process. Wishing you many great years in your new home.",
    tags: ["5-star", "closing"],
  },
];

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL or DIRECT_URL must be set");
  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  console.log("→ Seeding system templates…");
  for (const t of INDUSTRY_TEMPLATES) {
    await db
      .insert(templates)
      .values({
        industry: t.industry,
        name: t.name,
        body: t.body,
        tags: t.tags,
        isSystem: true,
      })
      .onConflictDoNothing();
  }

  console.log("→ Seeding demo organization…");
  const existing = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, "autofivestar-demo"))
    .limit(1);

  let orgId: string;
  if (existing.length === 0 || !existing[0]) {
    const inserted = await db
      .insert(organizations)
      .values({
        name: "AutoFiveStar Demo Co.",
        slug: "autofivestar-demo",
        industry: "hvac",
        plan: "growth",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      })
      .returning();
    orgId = inserted[0]!.id;
  } else {
    orgId = existing[0].id;
  }

  console.log("→ Seeding demo location…");
  const existingLoc = await db
    .select()
    .from(locations)
    .where(eq(locations.sourceLocationId, "demo-loc-1"))
    .limit(1);

  let locId: string;
  if (existingLoc.length === 0 || !existingLoc[0]) {
    const inserted = await db
      .insert(locations)
      .values({
        orgId,
        source: "google",
        sourceLocationId: "demo-loc-1",
        name: "AutoFiveStar Demo HVAC — Austin",
        addressLine1: "123 Main St",
        city: "Austin",
        state: "TX",
        postalCode: "78701",
        countryCode: "US",
        phone: "+15550101010",
        websiteUrl: "https://autofivestar.com",
        gbpAccountId: "accounts/demo-acct-1",
        connectedAt: new Date(),
      })
      .returning();
    locId = inserted[0]!.id;
  } else {
    locId = existingLoc[0].id;
  }

  console.log("→ Seeding demo reviews…");
  const demoReviews = [
    {
      sourceReviewId: "demo-rev-1",
      reviewerName: "Jamie L.",
      rating: 5,
      body: "The technician was on time, fixed our AC fast, and explained everything. Will use again!",
      sentiment: "positive" as const,
    },
    {
      sourceReviewId: "demo-rev-2",
      reviewerName: "Pat R.",
      rating: 2,
      body: "Showed up an hour late and the estimate felt high. Service itself was OK.",
      sentiment: "negative" as const,
    },
    {
      sourceReviewId: "demo-rev-3",
      reviewerName: "Sam K.",
      rating: 4,
      body: "Solid work, friendly team. Will use again.",
      sentiment: "positive" as const,
    },
    {
      sourceReviewId: "demo-rev-4",
      reviewerName: "Riley G.",
      rating: 1,
      body: "Felt the diagnosis was wrong. Had to call someone else.",
      sentiment: "negative" as const,
    },
  ];

  for (const r of demoReviews) {
    await db
      .insert(reviews)
      .values({
        id: randomUUID(),
        orgId,
        locationId: locId,
        source: "google",
        sourceReviewId: r.sourceReviewId,
        reviewerName: r.reviewerName,
        rating: r.rating,
        body: r.body,
        sentiment: r.sentiment,
        postedAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 96),
        status: "new",
      })
      .onConflictDoNothing();
  }

  console.log("✓ Seed complete.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
