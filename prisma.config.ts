import path from "node:path";
import { defineConfig, env } from "prisma/config";

try {
  process.loadEnvFile();
} catch {
  // No .env file — fall back to the ambient environment (CI, container, shell).
}

export default defineConfig({
  schema: path.join("prisma", "schema"),
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
