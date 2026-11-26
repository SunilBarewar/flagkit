import { Redis } from "ioredis";

import { Config } from "@/env.ts";

/**
 * Shared Redis client, used as the L2 cache.
 *
 * Redis is only a cache, so it must never slow requests down or take them down. Commands fail
 * fast (short timeout, no queueing while disconnected) and callers fall back to the database.
 */
export const redis = new Redis(Config.REDIS_URL, {
  commandTimeout: 200,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

// Without a listener, ioredis logs every failed reconnect attempt on its own.
redis.on("error", (error) => {
  console.error("redis error:", error.message);
});

export async function closeRedis(): Promise<void> {
  await redis.quit().catch(() => redis.disconnect());
}
