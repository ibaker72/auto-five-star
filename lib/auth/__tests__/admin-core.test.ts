import { describe, it, expect } from "vitest";
import { parseAdminEmails, isAdminEmail } from "../admin-core";

describe("parseAdminEmails", () => {
  it("returns [] for empty/null/undefined", () => {
    expect(parseAdminEmails(null)).toEqual([]);
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("")).toEqual([]);
    expect(parseAdminEmails("   ")).toEqual([]);
  });

  it("splits on commas, semicolons, and whitespace and lowercases", () => {
    expect(parseAdminEmails("A@x.com, b@y.com; C@z.com d@w.com")).toEqual([
      "a@x.com",
      "b@y.com",
      "c@z.com",
      "d@w.com",
    ]);
  });

  it("trims and drops blanks", () => {
    expect(parseAdminEmails("  one@x.com ,,  two@y.com ,")).toEqual([
      "one@x.com",
      "two@y.com",
    ]);
  });
});

describe("isAdminEmail", () => {
  const allow = "admin@autofivestar.com, qa@autofivestar.com";

  it("accepts an allowlisted email (case-insensitive)", () => {
    expect(isAdminEmail("admin@autofivestar.com", allow)).toBe(true);
    expect(isAdminEmail("QA@AutoFiveStar.com", allow)).toBe(true);
    expect(isAdminEmail("  qa@autofivestar.com  ", allow)).toBe(true);
  });

  it("rejects a non-allowlisted email", () => {
    expect(isAdminEmail("stranger@evil.com", allow)).toBe(false);
  });

  it("rejects when there is no allowlist", () => {
    expect(isAdminEmail("admin@autofivestar.com", "")).toBe(false);
    expect(isAdminEmail("admin@autofivestar.com", null)).toBe(false);
  });

  it("rejects empty/null email", () => {
    expect(isAdminEmail(null, allow)).toBe(false);
    expect(isAdminEmail(undefined, allow)).toBe(false);
    expect(isAdminEmail("", allow)).toBe(false);
  });
});
