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

/**
 * A connection in subscribe mode can't run normal commands, so pub/sub gets its own. Unlike
 * `redis`, it queues the subscribe command until connected and waits for as long as it takes.
 */
export const redisSubscriber = redis.duplicate({
  commandTimeout: undefined,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
});

redisSubscriber.on("error", (error) => {
  console.error("redis subscriber error:", error.message);
});

export async function closeRedis(): Promise<void> {
  await Promise.all([
    redis.quit().catch(() => redis.disconnect()),
    redisSubscriber.quit().catch(() => redisSubscriber.disconnect()),
  ]);
}
