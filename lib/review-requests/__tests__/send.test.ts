import { describe, it, expect } from "vitest";

function buildTrackedReviewUrl(recipientId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/r/${recipientId}`;
}

describe("buildTrackedReviewUrl", () => {
  it("builds a tracked URL with the recipient ID", () => {
    const url = buildTrackedReviewUrl("abc-123");
    expect(url).toBe("http://localhost:3000/r/abc-123");
  });

  it("uses NEXT_PUBLIC_APP_URL when set", () => {
    const original = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://www.autofivestar.com";
    const url = buildTrackedReviewUrl("def-456");
    expect(url).toBe("https://www.autofivestar.com/r/def-456");
    process.env.NEXT_PUBLIC_APP_URL = original;
  });
});
