import { describe, it, expect } from "vitest";

// We can't test the full DB-dependent tryAttributeReview here, but we can
// extract and test the name normalization logic.

function normalizeName(name: string): string | null {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim();
  const first = cleaned.split(/\s+/)[0];
  return first && first.length >= 2 ? first : null;
}

describe("normalizeName (attribution matching)", () => {
  it("extracts first name from full name", () => {
    expect(normalizeName("John Smith")).toBe("john");
  });

  it("handles single names", () => {
    expect(normalizeName("Alice")).toBe("alice");
  });

  it("strips non-alpha characters", () => {
    expect(normalizeName("José M.")).toBe("jos");
  });

  it("returns null for single-character names", () => {
    expect(normalizeName("J")).toBeNull();
  });

  it("returns null for empty strings", () => {
    expect(normalizeName("")).toBeNull();
    expect(normalizeName("   ")).toBeNull();
  });

  it("handles names with special characters", () => {
    expect(normalizeName("O'Brien")).toBe("obrien");
  });

  it("is case-insensitive", () => {
    expect(normalizeName("JOHN")).toBe("john");
    expect(normalizeName("john")).toBe("john");
    expect(normalizeName("John")).toBe("john");
  });

  it("matches reviewer to customer names correctly", () => {
    const reviewer = normalizeName("John S.");
    const customer = normalizeName("John Smith");
    expect(reviewer).toBe(customer);
  });
});
