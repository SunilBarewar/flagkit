import { Config } from "@/env.ts";
import { LRUCache } from "@/lib/cache/primitives/lru-cache.ts";
import { NoopL1Cache, NoopL2Cache } from "@/lib/cache/primitives/noop-stores.ts";
import { RedisCache, type RedisCacheOptions } from "@/lib/cache/primitives/redis-cache.ts";
import type { L1Store, L2Store } from "@/lib/cache/primitives/stores.ts";
import { redis } from "@/lib/cache/redis.ts";

/** The in-memory cache, or one that stores nothing if L1 is turned off (see env.ts). */
export function createL1<V>(ttlMs: number, maxEntries: number): L1Store<V> {
  return Config.L1_CACHE_ON ? new LRUCache<V>(ttlMs, maxEntries) : new NoopL1Cache<V>();
}

/** The Redis cache, or one that stores nothing if L2 is turned off (see env.ts). */
export function createL2<V>(options: RedisCacheOptions<V>): L2Store<V> {
  return redis ? new RedisCache<V>(redis, options) : new NoopL2Cache<V>();
}
