import { CacheInvalidator } from "@/lib/cache/primitives/cache-invalidator.ts";
import { NoopInvalidator } from "@/lib/cache/primitives/noop-stores.ts";
import type { Invalidator } from "@/lib/cache/primitives/stores.ts";
import { redis, redisSubscriber } from "@/lib/cache/redis.ts";

/**
 * One shared instance, so every cache uses the same pub/sub channel and subscription.
 * It only exists to clear L1 on other servers, so it does nothing unless both levels are on.
 */
export const cacheInvalidator: Invalidator =
  redis && redisSubscriber ? new CacheInvalidator(redis, redisSubscriber) : new NoopInvalidator();
