import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  // Booking
  HOLD_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  REFUND_WINDOW_HOURS: z.coerce.number().int().min(0).default(24),
  PARTIAL_REFUND_PERCENT: z.coerce.number().int().min(0).max(100).default(50),
  // Emulated payment gateway
  PAYMENT_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0),
  PAYMENT_LATENCY_MS: z.coerce.number().int().min(0).default(0),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
