import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ db: {} }));

const { PLAN_CONFIG, PLANS, isPlan, isBillingInterval, TRIAL_DAYS } =
  await import("../plans");
const { getPlanLimits } = await import("../entitlements");

describe("PLAN_CONFIG", () => {
  it("defines all three plans", () => {
    expect(PLANS).toEqual(["starter", "growth", "pro"]);
    for (const plan of PLANS) {
      expect(PLAN_CONFIG[plan]).toBeDefined();
    }
  });

  it("starter is the cheapest", () => {
    expect(PLAN_CONFIG.starter.priceMonthlyCents).toBeLessThan(
      PLAN_CONFIG.growth.priceMonthlyCents,
    );
    expect(PLAN_CONFIG.growth.priceMonthlyCents).toBeLessThan(
      PLAN_CONFIG.pro.priceMonthlyCents,
    );
  });

  it("yearly pricing gives a discount over monthly", () => {
    for (const plan of PLANS) {
      const cfg = PLAN_CONFIG[plan];
      expect(cfg.priceYearlyCents).toBeLessThan(cfg.priceMonthlyCents * 12);
    }
  });

  it("starter limits are the most restrictive", () => {
    expect(PLAN_CONFIG.starter.maxLocations).toBe(1);
    expect(PLAN_CONFIG.starter.monthlyAiResponses).toBe(50);
    expect(PLAN_CONFIG.starter.yelp).toBe(false);
    expect(PLAN_CONFIG.starter.smsAlerts).toBe(false);
    expect(PLAN_CONFIG.starter.bulkActions).toBe(false);
  });

  it("growth unlocks yelp and SMS", () => {
    expect(PLAN_CONFIG.growth.yelp).toBe(true);
    expect(PLAN_CONFIG.growth.smsAlerts).toBe(true);
    expect(PLAN_CONFIG.growth.monthlyAiResponses).toBeNull();
  });

  it("pro has the highest limits", () => {
    expect(PLAN_CONFIG.pro.maxLocations).toBe(10);
    expect(PLAN_CONFIG.pro.bulkActions).toBe(true);
  });

  it("all plans have features listed", () => {
    for (const plan of PLANS) {
      expect(PLAN_CONFIG[plan].features.length).toBeGreaterThan(0);
    }
  });

  it("trial is 7 days", () => {
    expect(TRIAL_DAYS).toBe(7);
  });
});

describe("isPlan", () => {
  it("accepts valid plans", () => {
    expect(isPlan("starter")).toBe(true);
    expect(isPlan("growth")).toBe(true);
    expect(isPlan("pro")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isPlan("enterprise")).toBe(false);
    expect(isPlan("")).toBe(false);
    expect(isPlan(null)).toBe(false);
    expect(isPlan(undefined)).toBe(false);
    expect(isPlan(42)).toBe(false);
  });
});

describe("isBillingInterval", () => {
  it("accepts monthly and yearly", () => {
    expect(isBillingInterval("monthly")).toBe(true);
    expect(isBillingInterval("yearly")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isBillingInterval("weekly")).toBe(false);
    expect(isBillingInterval("")).toBe(false);
  });
});

describe("getPlanLimits", () => {
  it("returns correct limits for each plan", () => {
    const starter = getPlanLimits("starter");
    expect(starter.plan).toBe("starter");
    expect(starter.maxLocations).toBe(1);
    expect(starter.monthlyAiResponses).toBe(50);
    expect(starter.yelp).toBe(false);
    expect(starter.smsAlerts).toBe(false);

    const growth = getPlanLimits("growth");
    expect(growth.maxLocations).toBe(3);
    expect(growth.monthlyAiResponses).toBeNull();
    expect(growth.yelp).toBe(true);

    const pro = getPlanLimits("pro");
    expect(pro.maxLocations).toBe(10);
    expect(pro.bulkActions).toBe(true);
  });
});
