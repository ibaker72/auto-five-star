import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { estimateCostCents } = await import("../openai");

describe("estimateCostCents", () => {
  it("calculates gpt-4o cost correctly", () => {
    const cost = estimateCostCents("gpt-4o", 100_000, 50_000);
    // 100k * 250 / 1M = 25 cents input
    // 50k * 1000 / 1M = 50 cents output
    expect(cost).toBe(75);
  });

  it("calculates gpt-4o-mini cost correctly", () => {
    const cost = estimateCostCents("gpt-4o-mini", 1_000_000, 1_000_000);
    // 1M * 15 / 1M = 15 cents input
    // 1M * 60 / 1M = 60 cents output
    expect(cost).toBe(75);
  });

  it("returns 0 for unknown models", () => {
    expect(estimateCostCents("unknown-model", 10_000, 5_000)).toBe(0);
  });

  it("returns 0 for zero tokens", () => {
    expect(estimateCostCents("gpt-4o", 0, 0)).toBe(0);
  });

  it("rounds to nearest cent", () => {
    const cost = estimateCostCents("gpt-4o", 1, 1);
    expect(Number.isInteger(cost)).toBe(true);
  });
});
