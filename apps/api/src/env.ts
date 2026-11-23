import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(8000),
  HOST: z.string().default("127.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string().min(1),
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

export const Config = schema.parse(process.env);
