import { Injectable } from "@nestjs/common";
import { Env, validateEnv } from "./env.schema";

@Injectable()
export class AppConfigService {
  readonly env: Env;

  constructor() {
    this.env = validateEnv(process.env);
  }

  get port(): number {
    return this.env.PORT;
  }

  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === "production";
  }

  get holdTtlSeconds(): number {
    return this.env.HOLD_TTL_SECONDS;
  }

  get refundWindowHours(): number {
    return this.env.REFUND_WINDOW_HOURS;
  }

  get partialRefundPercent(): number {
    return this.env.PARTIAL_REFUND_PERCENT;
  }

  get paymentFailureRate(): number {
    return this.env.PAYMENT_FAILURE_RATE;
  }

  get paymentLatencyMs(): number {
    return this.env.PAYMENT_LATENCY_MS;
  }
}
