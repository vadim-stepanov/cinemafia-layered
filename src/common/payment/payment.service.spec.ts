import { describe, expect, it } from "vitest";
import { AppConfigService } from "../config/config.service";
import { PaymentService } from "./payment.service";

function makeService(failureRate: number): { payment: PaymentService; config: { paymentFailureRate: number; paymentLatencyMs: number } } {
  const config = { paymentFailureRate: failureRate, paymentLatencyMs: 0 };
  return { payment: new PaymentService(config as AppConfigService), config };
}

describe("PaymentService (emulated)", () => {
  it("succeeds when failure rate is 0", async () => {
    const { payment } = makeService(0);
    const result = await payment.charge("booking-1", 1500);
    expect(result.outcome).toBe("SUCCEEDED");
    expect(result.providerRef).toBe("pay_booking-1");
  });

  it("fails when failure rate is 1", async () => {
    const { payment } = makeService(1);
    expect((await payment.charge("booking-2", 1500)).outcome).toBe("FAILED");
  });

  it("is idempotent: a settled success is never re-charged", async () => {
    const { payment, config } = makeService(0);
    const first = await payment.charge("booking-3", 1500);
    // Flip the gateway to always-fail; the prior success must still be returned.
    config.paymentFailureRate = 1;
    expect(await payment.charge("booking-3", 1500)).toEqual(first);
  });

  it("refund returns a provider reference", async () => {
    const { payment } = makeService(0);
    expect((await payment.refund("booking-4", 1500)).providerRef).toBe("rfnd_booking-4");
  });
});
