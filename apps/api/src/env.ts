import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(8000),
  HOST: z.string().default("127.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
});

export const Config = schema.parse(process.env);
