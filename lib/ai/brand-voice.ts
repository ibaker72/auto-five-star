import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { brandVoices, type BrandVoice } from "@/lib/db/schema";
import {
  getIndustryPack,
  type IndustryPack,
  type ResponseLength,
  type TonePreset,
} from "@/lib/templates/industry-packs";

export const TONE_PRESETS: ReadonlyArray<{
  id: TonePreset;
  label: string;
  description: string;
}> = [
  {
    id: "professional",
    label: "Professional",
    description: "Clear, polished, on-brand.",
  },
  {
    id: "friendly",
    label: "Friendly",
    description: "Conversational and approachable.",
  },
  {
    id: "warm",
    label: "Warm",
    description: "Reassuring and personal — good for clinics and salons.",
  },
  {
    id: "luxury",
    label: "Luxury",
    description: "Refined, restrained, no slang.",
  },
  {
    id: "direct",
    label: "Direct",
    description: "Short, no fluff.",
  },
];

export const RESPONSE_LENGTHS: ReadonlyArray<{
  id: ResponseLength;
  label: string;
  description: string;
}> = [
  { id: "short", label: "Short", description: "1-2 sentences." },
  { id: "medium", label: "Medium", description: "2-3 sentences." },
  { id: "detailed", label: "Detailed", description: "3-4 sentences." },
];

export function isTonePreset(value: unknown): value is TonePreset {
  return TONE_PRESETS.some((p) => p.id === value);
}

export function isResponseLength(value: unknown): value is ResponseLength {
  return RESPONSE_LENGTHS.some((l) => l.id === value);
}

/**
 * Build a plain-English instruction block tailored to the org's brand voice
 * and the selected industry pack. Used by lib/ai/generate.ts to enrich the
 * user message passed to the model. Safe defaults when nothing is configured.
 */
export function buildBrandVoiceInstructions(args: {
  voice: BrandVoice | null;
  industryPack: IndustryPack | null;
}): string {
  const { voice, industryPack } = args;
  const lines: string[] = [];

  if (industryPack) {
    lines.push(
      `INDUSTRY: ${industryPack.name} — ${industryPack.shortDescription}`,
    );
    lines.push(`STYLE GUIDANCE: ${industryPack.responseStyle}`);
    if (industryPack.cautionPhrases.length > 0) {
      lines.push(
        `AVOID CLAIMS LIKE: ${industryPack.cautionPhrases.map((p) => `"${p}"`).join(", ")}.`,
      );
    }
  }

  const preset = voice?.tonePreset ?? industryPack?.defaultTonePreset ?? null;
  if (preset) {
    lines.push(`TONE PRESET: ${preset}`);
  }

  const length =
    voice?.responseLength ?? industryPack?.defaultResponseLength ?? null;
  if (length) {
    lines.push(
      `RESPONSE LENGTH: ${length} (${describeLength(length as ResponseLength)})`,
    );
  }

  const emoji =
    voice?.emojiAllowed ?? industryPack?.defaultEmojiAllowed ?? false;
  lines.push(
    `EMOJI: ${emoji ? "allowed sparingly when natural" : "do not use emoji"}.`,
  );

  if (voice?.voiceSignature) {
    lines.push(
      `SIGNATURE: end with: "${voice.voiceSignature.replace(/"/g, '\\"')}"`,
    );
  }

  if (voice?.customNotes && voice.customNotes.trim().length > 0) {
    lines.push(`OWNER NOTES: ${voice.customNotes.trim()}`);
  }

  return lines.join("\n");
}

function describeLength(l: ResponseLength): string {
  switch (l) {
    case "short":
      return "1-2 sentences";
    case "medium":
      return "2-3 sentences";
    case "detailed":
      return "3-4 sentences";
  }
}

export async function getBrandVoiceForOrg(
  orgId: string,
): Promise<BrandVoice | null> {
  const rows = await db
    .select()
    .from(brandVoices)
    .where(eq(brandVoices.orgId, orgId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertBrandVoiceForOrg(args: {
  orgId: string;
  userId: string;
  tonePreset?: TonePreset | null;
  responseLength?: ResponseLength | null;
  emojiAllowed?: boolean;
  voiceSignature?: string | null;
  customNotes?: string | null;
  industryPack?: string | null;
  samples?: string[];
}): Promise<BrandVoice> {
  const existing = await getBrandVoiceForOrg(args.orgId);
  if (existing) {
    const updated = await db
      .update(brandVoices)
      .set({
        tonePreset: args.tonePreset ?? existing.tonePreset,
        responseLength: args.responseLength ?? existing.responseLength,
        emojiAllowed: args.emojiAllowed ?? existing.emojiAllowed,
        voiceSignature: args.voiceSignature ?? existing.voiceSignature,
        customNotes: args.customNotes ?? existing.customNotes,
        industryPack: args.industryPack ?? existing.industryPack,
        samples: args.samples ?? existing.samples,
        updatedByUserId: args.userId,
        updatedAt: new Date(),
      })
      .where(eq(brandVoices.orgId, args.orgId))
      .returning();
    return updated[0] ?? existing;
  }
  const inserted = await db
    .insert(brandVoices)
    .values({
      orgId: args.orgId,
      tonePreset: args.tonePreset ?? null,
      responseLength: args.responseLength ?? null,
      emojiAllowed: args.emojiAllowed ?? false,
      voiceSignature: args.voiceSignature ?? null,
      customNotes: args.customNotes ?? null,
      industryPack: args.industryPack ?? null,
      samples: args.samples ?? [],
      updatedByUserId: args.userId,
    })
    .returning();
  if (!inserted[0]) throw new Error("Failed to upsert brand voice");
  return inserted[0];
}
