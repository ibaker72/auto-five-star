import "server-only";
import OpenAI from "openai";
import {
  buildUserMessage,
  PROMPT_VERSION,
  responseSchema,
  SYSTEM_PROMPT,
  type GeneratedResponse,
  type PromptInput,
} from "@/lib/ai/prompts/responseGenerator.v1";
import { withRetry } from "./_retry";

/**
 * AI live/fixture mode.
 *
 * - AI_LIVE=true  → call OpenAI.
 * - AI_LIVE=false → return a deterministic fixture (dev only).
 *
 * We refuse to fall back to fixtures in production: if AI_LIVE is unset or
 * "false" in production, generation errors out so the operator knows.
 */
const AI_LIVE = process.env.AI_LIVE === "true";
const IS_PROD = process.env.NODE_ENV === "production";
const USE_FIXTURE = !AI_LIVE && !IS_PROD;

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is required");
    _client = new OpenAI({ apiKey: key, maxRetries: 0 });
  }
  return _client;
}

const PRICE_TABLE: Record<string, { in: number; out: number }> = {
  "gpt-4o": { in: 250, out: 1000 }, // cents per 1M tokens
  "gpt-4o-mini": { in: 15, out: 60 },
};

export function estimateCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = PRICE_TABLE[model];
  if (!p) return 0;
  return Math.round(
    (inputTokens * p.in) / 1_000_000 + (outputTokens * p.out) / 1_000_000,
  );
}

export type GenerationResult = {
  response: GeneratedResponse;
  model: string;
  promptVersion: string;
  tokensInput: number;
  tokensOutput: number;
  costCents: number;
  fixture: boolean;
};

export class OpenAiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAiConfigError";
  }
}

function isRetryableOpenAiError(err: unknown): boolean {
  if (err instanceof OpenAI.APIError) {
    if (typeof err.status === "number") {
      return err.status === 429 || err.status >= 500;
    }
  }
  return err instanceof TypeError; // network blip
}

export async function generateResponseDrafts(
  input: PromptInput,
): Promise<GenerationResult> {
  if (USE_FIXTURE) {
    return fixtureResponse(input);
  }

  if (!AI_LIVE && IS_PROD) {
    throw new OpenAiConfigError(
      "AI_LIVE must be true in production. Refusing to return fixture drafts.",
    );
  }

  const model = process.env.OPENAI_MODEL_PRIMARY ?? "gpt-4o";

  const completion = await withRetry(
    () =>
      client().chat.completions.create({
        model,
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1500,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserMessage(input) },
        ],
      }),
    { maxAttempts: 3, baseDelayMs: 500, retryable: isRetryableOpenAiError },
  );

  const raw = completion.choices[0]?.message.content;
  if (!raw) throw new Error("OpenAI returned empty content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`OpenAI returned non-JSON: ${(e as Error).message}`);
  }

  const response = responseSchema.parse(parsed);

  const tokensInput = completion.usage?.prompt_tokens ?? 0;
  const tokensOutput = completion.usage?.completion_tokens ?? 0;
  const costCents = estimateCostCents(model, tokensInput, tokensOutput);

  return {
    response,
    model,
    promptVersion: PROMPT_VERSION,
    tokensInput,
    tokensOutput,
    costCents,
    fixture: false,
  };
}

// ---------------------------------------------------------------------------
// Fixtures (dev only)
// ---------------------------------------------------------------------------
function fixtureResponse(input: PromptInput): GenerationResult {
  const { review, business } = input;
  const reviewer = (review.reviewerName ?? "").split(" ")[0] ?? "there";

  const positive = review.rating >= 4;
  const negative = review.rating <= 2;

  let warm: string;
  let professional: string;
  let brief: string;
  let sentiment: GeneratedResponse["sentiment"];

  if (positive) {
    sentiment = "positive";
    warm = `Hi ${reviewer}, thank you so much for taking the time to share this — it truly means a lot to our team at ${business.name}. We're glad the experience went smoothly and we can't wait to see you again next time.`;
    professional = `Thank you, ${reviewer}. We appreciate the kind words about our team at ${business.name}, and we're glad we could help. We look forward to working with you again.`;
    brief = `Thanks, ${reviewer}! We appreciate the kind words and look forward to seeing you again.`;
  } else if (negative) {
    sentiment = "negative";
    warm = `Hi ${reviewer}, we're sorry the experience fell short — that isn't what we want for our customers at ${business.name}. We'd really like the chance to make this right. Could you call our office so we can dig in personally?`;
    professional = `Thank you for letting us know, ${reviewer}. We take feedback like this seriously at ${business.name}. Please reach out to our office so we can follow up directly and make this right.`;
    brief = `We're sorry, ${reviewer}. Please call our office so we can make this right.`;
  } else {
    sentiment = "neutral";
    warm = `Thanks for the honest feedback, ${reviewer}. The whole team at ${business.name} reads every review, and we appreciate the chance to do better next visit. We'd love to see you again.`;
    professional = `Thank you for your feedback, ${reviewer}. We've shared this with the team at ${business.name} and we'd appreciate the chance to earn a stronger review next time.`;
    brief = `Thanks for the feedback, ${reviewer}. We hope to do better next time.`;
  }

  return {
    response: {
      variants: {
        warm: {
          body: warm,
          rationale: "Adds warmth, references the business name and the reviewer.",
        },
        professional: {
          body: professional,
          rationale: "Balanced, concise, no slang.",
        },
        brief: { body: brief, rationale: "Under 240 characters, on-brand." },
      },
      sentiment,
      flags: negative ? ["needs_owner_review"] : [],
    },
    model: "fixture",
    promptVersion: PROMPT_VERSION,
    tokensInput: 0,
    tokensOutput: 0,
    costCents: 0,
    fixture: true,
  };
}
