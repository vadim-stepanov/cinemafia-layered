import { describe, expect, it } from "vitest";
import { EntitlementsService } from "./entitlements.service";

const service = new EntitlementsService();

describe("EntitlementsService.resolve", () => {
  it("non-member with no loyalty has no entitlements", () => {
    expect(service.resolve(null, 0)).toEqual({
      effectiveGuestQuota: 0,
      discountPercent: 0,
      canEarlyAccess: false,
    });
  });

  it("BASIC active: base quota, no discount, no early access", () => {
    expect(service.resolve({ tier: "BASIC", status: "ACTIVE" }, 0)).toEqual({
      effectiveGuestQuota: 1,
      discountPercent: 0,
      canEarlyAccess: false,
    });
  });

  it("PLUS active: quota, discount and early access", () => {
    expect(service.resolve({ tier: "PLUS", status: "ACTIVE" }, 0)).toEqual({
      effectiveGuestQuota: 2,
      discountPercent: 5,
      canEarlyAccess: true,
    });
  });

  it("PRO active combines base quota with loyalty bonus", () => {
    // degree 6 → bonus min(floor(6/3), 3) = 2; PRO base 4 → 6
    expect(service.resolve({ tier: "PRO", status: "ACTIVE" }, 6)).toEqual({
      effectiveGuestQuota: 6,
      discountPercent: 10,
      canEarlyAccess: true,
    });
  });

  it("EXPIRED membership grants no base — only loyalty bonus survives", () => {
    expect(service.resolve({ tier: "PRO", status: "EXPIRED" }, 6)).toEqual({
      effectiveGuestQuota: 2,
      discountPercent: 0,
      canEarlyAccess: false,
    });
  });

  it("caps the loyalty guest bonus", () => {
    expect(service.resolve(null, 100).effectiveGuestQuota).toBe(3);
  });
});

describe("EntitlementsService.canAccessSession", () => {
  const now = new Date("2026-06-01T00:00:00.000Z");
  const future = new Date("2026-07-01T00:00:00.000Z");
  const past = new Date("2026-05-01T00:00:00.000Z");

  it("denies when loyalty degree is below the session minimum", () => {
    expect(
      service.canAccessSession(2, true, { minLoyaltyDegree: 5, earlyAccessUntil: null }, now),
    ).toBe(false);
  });

  it("denies inside the early-access window without early access", () => {
    expect(
      service.canAccessSession(5, false, { minLoyaltyDegree: 0, earlyAccessUntil: future }, now),
    ).toBe(false);
  });

  it("allows inside the early-access window with early access", () => {
    expect(
      service.canAccessSession(5, true, { minLoyaltyDegree: 0, earlyAccessUntil: future }, now),
    ).toBe(true);
  });

  it("allows once the early-access window has passed", () => {
    expect(
      service.canAccessSession(0, false, { minLoyaltyDegree: 0, earlyAccessUntil: past }, now),
    ).toBe(true);
  });
});
