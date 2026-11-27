import { Redis } from "ioredis";

import { Config } from "@/env.ts";

/** Undefined while the Redis (L2) cache is off, in which case we never connect to Redis. */
export const redis = Config.L2_CACHE_ON ? createRedis() : undefined;

/**
 * A connection in subscribe mode can't run normal commands, so pub/sub gets its own. Unlike
 * `redis`, it queues the subscribe command until connected and waits for as long as it takes.
 *
 * Only needed when both levels are on: pub/sub tells other servers to drop their L1 copy.
 */
export const redisSubscriber =
  redis && Config.L1_CACHE_ON
    ? listenForErrors(
        redis.duplicate({
          commandTimeout: undefined,
          maxRetriesPerRequest: null,
          enableOfflineQueue: true,
        }),
        "redis subscriber",
      )
    : undefined;

function createRedis(): Redis {
  return listenForErrors(
    new Redis(Config.REDIS_URL!, {
      commandTimeout: 200,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    }),
    "redis",
  );
}

function listenForErrors(client: Redis, name: string): Redis {
  client.on("error", (error) => {
    console.error(`${name} error:`, error.message);
  });
  return client;
}

export async function closeRedis(): Promise<void> {
  await Promise.all(
    [redis, redisSubscriber].map((client) => client?.quit().catch(() => client.disconnect())),
  );
}
