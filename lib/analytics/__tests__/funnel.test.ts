import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ db: {} }));

import { isFunnelEventType, FUNNEL_EVENT_TYPES } from "../funnel";

describe("isFunnelEventType", () => {
  it("accepts all defined event types", () => {
    for (const t of FUNNEL_EVENT_TYPES) {
      expect(isFunnelEventType(t)).toBe(true);
    }
  });

  it("accepts audit_pdf_downloaded", () => {
    expect(isFunnelEventType("audit_pdf_downloaded")).toBe(true);
  });

  it("rejects unknown event types", () => {
    expect(isFunnelEventType("unknown_event")).toBe(false);
    expect(isFunnelEventType("")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isFunnelEventType(123)).toBe(false);
    expect(isFunnelEventType(null)).toBe(false);
    expect(isFunnelEventType(undefined)).toBe(false);
  });
});
