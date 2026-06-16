import OpenAI from "openai";
import {
  buildUserMessage,
  PROMPT_VERSION,
  responseSchema,
  SYSTEM_PROMPT,
  type GeneratedResponse,
  type PromptInput,
} from "@/lib/ai/prompts/responseGenerator.v1";

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is required");
    _client = new OpenAI({ apiKey: key });
  }
  return _client;
}

// gpt-4o pricing as of 2026-06: $2.50 / 1M input, $10.00 / 1M output.
// Update this table when models or pricing change.
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
  return Math.round((inputTokens * p.in) / 1_000_000 + (outputTokens * p.out) / 1_000_000);
}

export type GenerationResult = {
  response: GeneratedResponse;
  model: string;
  promptVersion: string;
  tokensInput: number;
  tokensOutput: number;
  costCents: number;
};

// PR #6/7 callers must:
//   1. `await requireEntitlement(orgId, "ai.generate")`
//   2. `await incrementAiUsage(orgId, 1, result.costCents)` after generation
// from `lib/billing/entitlements` to enforce the Starter monthly quota.

export async function generateResponseDrafts(
  input: PromptInput,
): Promise<GenerationResult> {
  const model = process.env.OPENAI_MODEL_PRIMARY ?? "gpt-4o";
  const completion = await client().chat.completions.create({
    model,
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 1500,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(input) },
    ],
  });

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
  };
}
