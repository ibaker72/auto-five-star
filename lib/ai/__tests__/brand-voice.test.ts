import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ db: {} }));

const { buildBrandVoiceInstructions, TONE_PRESETS, RESPONSE_LENGTHS } =
  await import("../brand-voice");

describe("TONE_PRESETS", () => {
  it("has at least 2 presets", () => {
    expect(TONE_PRESETS.length).toBeGreaterThanOrEqual(2);
  });

  it("each preset has required fields", () => {
    for (const preset of TONE_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.label).toBeTruthy();
      expect(preset.description).toBeTruthy();
    }
  });
});

describe("RESPONSE_LENGTHS", () => {
  it("has at least 2 lengths", () => {
    expect(RESPONSE_LENGTHS.length).toBeGreaterThanOrEqual(2);
  });

  it("each length has required fields", () => {
    for (const len of RESPONSE_LENGTHS) {
      expect(len.id).toBeTruthy();
      expect(len.label).toBeTruthy();
    }
  });
});

describe("buildBrandVoiceInstructions", () => {
  it("includes tone preset when voice has one", () => {
    const result = buildBrandVoiceInstructions({
      voice: {
        toneFormal: 80,
        toneWarm: 60,
        toneBrevity: 40,
        emojiAllowed: false,
        voiceSignature: "— Team Alpha",
        customNotes: "Always mention our 30-day guarantee",
        tonePreset: "friendly",
        responseLength: "medium",
        samples: [],
      } as unknown as Parameters<typeof buildBrandVoiceInstructions>[0]["voice"],
      industryPack: null,
    });
    expect(result).toContain("TONE PRESET: friendly");
    expect(result).toContain("RESPONSE LENGTH: medium");
    expect(result).toContain("SIGNATURE");
    expect(result).toContain("Team Alpha");
    expect(result).toContain("30-day guarantee");
  });

  it("returns emoji-disallowed instruction by default", () => {
    const result = buildBrandVoiceInstructions({
      voice: null,
      industryPack: null,
    });
    expect(result).toContain("do not use emoji");
  });

  it("includes industry pack caution phrases", () => {
    const result = buildBrandVoiceInstructions({
      voice: null,
      industryPack: {
        id: "healthcare",
        name: "Healthcare",
        emoji: "🏥",
        shortDescription: "Medical practices",
        responseStyle: "Empathetic and HIPAA-aware",
        cautionPhrases: ["guaranteed cure", "we promise results"],
        defaultTonePreset: "warm",
        defaultResponseLength: "medium",
        defaultEmojiAllowed: false,
      } as unknown as Parameters<typeof buildBrandVoiceInstructions>[0]["industryPack"],
    });
    expect(result).toContain("Healthcare");
    expect(result).toContain("guaranteed cure");
    expect(result).toContain("TONE PRESET: warm");
  });
});
