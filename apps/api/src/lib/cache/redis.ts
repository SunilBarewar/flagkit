import { Redis } from "ioredis";

import { Config } from "@/env.ts";

export const redis = new Redis(Config.REDIS_URL, {
  commandTimeout: 200,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

redis.on("error", (error) => {
  console.error("redis error:", error.message);
});

export async function closeRedis(): Promise<void> {
  await redis.quit().catch(() => redis.disconnect());
}
