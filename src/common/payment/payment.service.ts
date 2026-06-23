import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../config/config.service";

export type PaymentOutcome = "SUCCEEDED" | "FAILED";

export interface PaymentResult {
  outcome: PaymentOutcome;
  providerRef: string;
}

export interface RefundResult {
  providerRef: string;
}

/**
 * Demo-boundary: emulated payment gateway. Simulates latency and a configurable
 * failure rate, and is idempotent by key (a settled charge is never re-charged).
 * Swappable for a real PSP adapter; payments are not the subject of this portfolio.
 */
@Injectable()
export class PaymentService {
  private readonly settled = new Map<string, PaymentResult>();

  constructor(private readonly config: AppConfigService) {}

  async charge(idempotencyKey: string, _amountCents: number): Promise<PaymentResult> {
    const prior = this.settled.get(idempotencyKey);
    if (prior?.outcome === "SUCCEEDED") {
      return prior;
    }

    await this.simulateLatency();
    const failed = Math.random() < this.config.paymentFailureRate;
    const result: PaymentResult = {
      outcome: failed ? "FAILED" : "SUCCEEDED",
      providerRef: `pay_${idempotencyKey}`,
    };
    this.settled.set(idempotencyKey, result);
    return result;
  }

  async refund(idempotencyKey: string, _amountCents: number): Promise<RefundResult> {
    await this.simulateLatency();
    return { providerRef: `rfnd_${idempotencyKey}` };
  }

  private simulateLatency(): Promise<void> {
    const ms = this.config.paymentLatencyMs;
    return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
  }
}
