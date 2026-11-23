import { defineConfig } from "drizzle-kit";

// Single env file for the whole monorepo lives at the repo root.
process.loadEnvFile("../../.env");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
