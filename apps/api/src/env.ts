import { z } from "zod";

// Env vars are strings, so "false" would be truthy with z.coerce.boolean(). Only "true"/"false" are valid.
const booleanFlag = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(8000),
  HOST: z.string().default("127.0.0.1"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string().min(1),
  // Needed only while the Redis (L2) cache is on, see CACHE_L2_ENABLED.
  // An empty value counts as unset.
  REDIS_URL: z.preprocess((value) => value || undefined, z.string().optional()),
  // Master switch. "false" turns off both cache levels and every request reads the database.
  CACHE_ENABLED: booleanFlag,
  // In-memory (L1) cache. Needs CACHE_ENABLED.
  CACHE_L1_ENABLED: booleanFlag,
  // Redis (L2) cache and cross-server invalidation. Needs CACHE_ENABLED and REDIS_URL.
  CACHE_L2_ENABLED: booleanFlag,
  JWT_SECRET: z.string().min(32),
  API_KEY_PEPPER: z.string().min(32),
  // Comma-separated list of browser origins allowed to call the API, e.g. "http://localhost:3000".
  // Empty means no cross-origin access. Never "*": cookies require explicit origins.
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
});

const parsed = schema
  .refine((env) => !(env.CACHE_ENABLED && env.CACHE_L2_ENABLED) || env.REDIS_URL, {
    path: ["REDIS_URL"],
    message: "REDIS_URL is required unless CACHE_ENABLED or CACHE_L2_ENABLED is false",
  })
  .parse(process.env);

export const Config = {
  ...parsed,
  /** What is actually on: each level also needs the master switch. */
  L1_CACHE_ON: parsed.CACHE_ENABLED && parsed.CACHE_L1_ENABLED,
  L2_CACHE_ON: parsed.CACHE_ENABLED && parsed.CACHE_L2_ENABLED,
};
