import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ db: {} }));

const { classifyReviewAlert } = await import("../review-alerts");

describe("classifyReviewAlert", () => {
  it("classifies 1-star as urgent", () => {
    expect(classifyReviewAlert(1)).toBe("review.alert.urgent");
  });

  it("classifies 2-star as urgent", () => {
    expect(classifyReviewAlert(2)).toBe("review.alert.urgent");
  });

  it("classifies 3-star as daily digest", () => {
    expect(classifyReviewAlert(3)).toBe("review.alert.daily_digest_pending");
  });

  it("classifies 4-star as weekly digest", () => {
    expect(classifyReviewAlert(4)).toBe("review.alert.weekly_digest_pending");
  });

  it("classifies 5-star as weekly digest", () => {
    expect(classifyReviewAlert(5)).toBe("review.alert.weekly_digest_pending");
  });
});
