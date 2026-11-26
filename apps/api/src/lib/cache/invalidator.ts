import { CacheInvalidator } from "@/lib/cache/primitives/cache-invalidator.ts";
import { redis, redisSubscriber } from "@/lib/cache/redis.ts";

/** One shared instance, so every cache uses the same pub/sub channel and subscription. */
export const cacheInvalidator = new CacheInvalidator(redis, redisSubscriber);
