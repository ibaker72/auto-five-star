import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the DB client so we can assert whether the route ever touches the DB.
// The terminal .limit() resolves to no rows, so a well-formed UUID flows past
// the guard, queries, finds nothing, and falls back — proving valid behavior
// is preserved while a malformed id never reaches the DB at all.
vi.mock("@/lib/db/client", () => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.from = vi.fn(chain);
  builder.innerJoin = vi.fn(chain);
  builder.where = vi.fn(chain);
  builder.limit = vi.fn(() => Promise.resolve([] as unknown[]));
  return {
    db: {
      select: vi.fn(() => builder),
      update: vi.fn(),
      insert: vi.fn(),
    },
    schema: {},
  };
});

import { GET } from "../route";
import { db } from "@/lib/db/client";

const FALLBACK = "https://www.autofivestar.com";

function call(recipientId: string) {
  return GET({} as never, {
    params: Promise.resolve({ recipientId }),
  });
}

describe("GET /r/[recipientId] — UUID guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", FALLBACK);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects a malformed (non-UUID) id to the fallback without querying the DB", async () => {
    const res = await call("not-a-uuid");

    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const location = res.headers.get("location");
    expect(location).toBeTruthy();
    expect(location?.startsWith(FALLBACK)).toBe(true);
    // Must NOT echo the bad id, and must short-circuit before any DB access.
    expect(location).not.toContain("not-a-uuid");
    expect(db.select).not.toHaveBeenCalled();
  });

  it("rejects a SQL-injection-shaped id the same way (no DB access)", async () => {
    const res = await call("1; DROP TABLE review_request_recipients;--");

    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("location")?.startsWith(FALLBACK)).toBe(true);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("still queries the DB for a well-formed UUID (valid behavior preserved)", async () => {
    const res = await call("11111111-1111-1111-1111-111111111111");

    // No matching row in the mock → graceful fallback redirect, but the DB
    // WAS queried, confirming the guard doesn't block legitimate links.
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(db.select).toHaveBeenCalledTimes(1);
  });
});
