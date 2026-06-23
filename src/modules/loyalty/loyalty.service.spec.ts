import { describe, expect, it, vi } from "vitest";
import { LoyaltyRepository } from "./loyalty.repository";
import { DEGREES_PER_CONFIRMED_BOOKING, LoyaltyService } from "./loyalty.service";

describe("LoyaltyService", () => {
  it("accrues a fixed degree per confirmed booking", async () => {
    const increment = vi.fn().mockResolvedValue(undefined);
    const service = new LoyaltyService({ incrementDegree: increment } as unknown as LoyaltyRepository);

    await service.accrueForConfirmedBooking("member-1");

    expect(increment).toHaveBeenCalledWith("member-1", DEGREES_PER_CONFIRMED_BOOKING);
  });
});
