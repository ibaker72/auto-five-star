import { z } from "zod";

export const PROMPT_VERSION = "responseGenerator.v1";

export type PromptInput = {
  business: {
    name: string;
    industry?: string | null;
  };
  location: {
    name: string;
    city?: string | null;
    state?: string | null;
  };
  voice: {
    formal: number;
    warm: number;
    brevity: number;
    samples: string[];
  };
  review: {
    rating: number;
    reviewerName?: string | null;
    body?: string | null;
    postedAt: string;
    language?: string | null;
  };
};

export const SYSTEM_PROMPT = `You are AutoFiveStar, an assistant that drafts replies to Google reviews for local businesses. Generate three reply variants: "warm", "professional", "brief".

Rules:
- Use the business's brand voice (tone sliders + sample replies).
- Address the reviewer by first name if provided; otherwise no name.
- Thank them and reference a concrete detail from their review when possible.
- For 1-2 stars: acknowledge the issue, apologize sincerely, offer to make it right, invite offline contact (phone or email). Never argue. Never blame the customer.
- For 3 stars: thank them, acknowledge constructive feedback, invite them back.
- For 4-5 stars: thank them, reinforce the positive specifics, invite future visits.
- Never invent facts, promotions, discounts, or guarantees.
- Never claim outcomes ("guaranteed satisfaction", "best in town", etc.).
- Never include phone numbers, URLs, or addresses unless they appear in the brand-voice samples.
- Length: "brief" <= 240 chars. "professional" 250-400 chars. "warm" 350-500 chars.
- Match the language of the review.
- Respond as the business owner using "we", not third-person.

Return ONLY JSON matching this schema (no markdown, no commentary):
{
  "variants": {
    "warm":         { "body": string, "rationale": string },
    "professional": { "body": string, "rationale": string },
    "brief":        { "body": string, "rationale": string }
  },
  "sentiment": "positive" | "neutral" | "negative",
  "flags": string[]
}

Flags can include: "legal_risk", "needs_owner_review", "mentions_competitor", "off_topic".
`;

export function buildUserMessage(input: PromptInput): string {
  const { business, location, voice, review } = input;
  const samples =
    voice.samples.length > 0
      ? voice.samples.map((s, i) => `${i + 1}. "${s}"`).join("\n")
      : "(no samples — fall back to a balanced friendly-professional tone)";

  return `BUSINESS: ${business.name}${business.industry ? ` (${business.industry})` : ""}
LOCATION: ${location.name}${location.city ? `, ${location.city}` : ""}${location.state ? `, ${location.state}` : ""}

BRAND VOICE (0-100 scale):
- formal: ${voice.formal}
- warm: ${voice.warm}
- brevity: ${voice.brevity}

SAMPLE REPLIES:
${samples}

REVIEW:
Rating: ${review.rating}/5
Reviewer: ${review.reviewerName ?? "Anonymous"}
Posted: ${review.postedAt}
Language: ${review.language ?? "en"}
Body: """${review.body ?? ""}"""`;
}

export const variantSchema = z.object({
  body: z.string().min(1),
  rationale: z.string().min(1),
});

export const responseSchema = z.object({
  variants: z.object({
    warm: variantSchema,
    professional: variantSchema,
    brief: variantSchema,
  }),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  flags: z.array(z.string()).default([]),
});

export type GeneratedResponse = z.infer<typeof responseSchema>;
