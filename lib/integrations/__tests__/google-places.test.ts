import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const {
  findBusinessOnPlaces,
  findCompetitors,
  isPlacesConfigured,
} = await import("../google-places");

const ORIGINAL_KEY = process.env.GOOGLE_PLACES_API_KEY;

function mockFetchOnce(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: `HTTP ${status}`,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const SAMPLE_PLACE = {
  id: "place-123",
  displayName: { text: "Acme HVAC" },
  rating: 4.6,
  userRatingCount: 182,
  formattedAddress: "123 Main St, Austin, TX",
  primaryType: "hvac_contractor",
  primaryTypeDisplayName: { text: "HVAC contractor" },
  types: ["hvac_contractor", "point_of_interest"],
};

describe("google-places (no key)", () => {
  beforeEach(() => {
    delete process.env.GOOGLE_PLACES_API_KEY;
  });
  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = ORIGINAL_KEY;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("isPlacesConfigured returns false", () => {
    expect(isPlacesConfigured()).toBe(false);
  });

  it("findBusinessOnPlaces returns null without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await findBusinessOnPlaces("Acme HVAC", "Austin");
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("findCompetitors returns [] without a key", async () => {
    const result = await findCompetitors({
      business: {
        placeId: "x",
        name: "x",
        rating: 4,
        reviewCount: 1,
        formattedAddress: null,
        primaryType: null,
        primaryTypeDisplayName: null,
        types: [],
      },
      city: "Austin",
    });
    expect(result).toEqual([]);
  });
});

describe("google-places (with key)", () => {
  beforeEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
  });
  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = ORIGINAL_KEY;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("parses a successful business lookup", async () => {
    const fetchMock = mockFetchOnce(200, { places: [SAMPLE_PLACE] });
    const result = await findBusinessOnPlaces("Acme HVAC", "Austin");
    expect(result).not.toBeNull();
    expect(result!.placeId).toBe("place-123");
    expect(result!.name).toBe("Acme HVAC");
    expect(result!.rating).toBe(4.6);
    expect(result!.reviewCount).toBe(182);
    expect(result!.primaryTypeDisplayName).toBe("HVAC contractor");
    // Verify the key went in the header, not the body/URL.
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init.headers as Record<string, string>)["X-Goog-Api-Key"]).toBe(
      "test-key",
    );
  });

  it("returns null when Places finds nothing", async () => {
    mockFetchOnce(200, { places: [] });
    const result = await findBusinessOnPlaces("Nonexistent Biz", "Nowhere");
    expect(result).toBeNull();
  });

  it("returns null (graceful) when the API errors", async () => {
    mockFetchOnce(403, { error: { message: "permission denied" } });
    const result = await findBusinessOnPlaces("Acme HVAC", "Austin");
    expect(result).toBeNull();
  });

  it("returns null (graceful) on a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("network down")),
    );
    const result = await findBusinessOnPlaces("Acme HVAC", "Austin");
    expect(result).toBeNull();
  });

  it("excludes the business itself from competitors", async () => {
    mockFetchOnce(200, {
      places: [
        SAMPLE_PLACE,
        {
          id: "comp-1",
          displayName: { text: "Rival HVAC" },
          rating: 4.2,
          userRatingCount: 90,
          types: [],
        },
        {
          id: "comp-2",
          displayName: { text: "Other HVAC" },
          rating: 4.8,
          userRatingCount: 250,
          types: [],
        },
      ],
    });
    const business = {
      placeId: "place-123",
      name: "Acme HVAC",
      rating: 4.6,
      reviewCount: 182,
      formattedAddress: null,
      primaryType: "hvac_contractor",
      primaryTypeDisplayName: "HVAC contractor",
      types: [],
    };
    const competitors = await findCompetitors({ business, city: "Austin" });
    expect(competitors.map((c) => c.placeId)).toEqual(["comp-1", "comp-2"]);
  });

  it("drops competitors missing rating/review data", async () => {
    mockFetchOnce(200, {
      places: [
        {
          id: "comp-1",
          displayName: { text: "No Data HVAC" },
          types: [],
        },
        {
          id: "comp-2",
          displayName: { text: "Good HVAC" },
          rating: 4.4,
          userRatingCount: 70,
          types: [],
        },
      ],
    });
    const business = {
      placeId: "place-123",
      name: "Acme HVAC",
      rating: 4.6,
      reviewCount: 182,
      formattedAddress: null,
      primaryType: "hvac_contractor",
      primaryTypeDisplayName: "HVAC contractor",
      types: [],
    };
    const competitors = await findCompetitors({ business, city: "Austin" });
    expect(competitors.map((c) => c.placeId)).toEqual(["comp-2"]);
  });

  it("returns [] (graceful) when competitor search errors", async () => {
    mockFetchOnce(500, { error: "boom" });
    const business = {
      placeId: "place-123",
      name: "Acme HVAC",
      rating: 4.6,
      reviewCount: 182,
      formattedAddress: null,
      primaryType: "hvac_contractor",
      primaryTypeDisplayName: "HVAC contractor",
      types: [],
    };
    const competitors = await findCompetitors({ business, city: "Austin" });
    expect(competitors).toEqual([]);
  });
});
