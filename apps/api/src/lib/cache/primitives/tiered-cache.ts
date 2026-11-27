import { z } from "zod";

import type { CacheInvalidator } from "@/lib/cache/primitives/cache-invalidator.ts";
import type { LRUCache } from "@/lib/cache/primitives/lru-cache.ts";
import type { RedisCache } from "@/lib/cache/primitives/redis-cache.ts";
import { RequestCoalescer } from "@/lib/cache/primitives/request-coalescer.ts";

/**
 * What the two levels store. `missing` means the source has no such key, so lookups for it
 * can be answered without asking the source again (negative caching).
 */
export type CacheEntry<V> = { status: "active"; value: V } | { status: "missing" };

/** Schema for a `CacheEntry`, for the Redis level. `valueSchema` describes the `active` value. */
export function cacheEntrySchema<V>(valueSchema: z.ZodType<V>): z.ZodType<CacheEntry<V>> {
  return z.discriminatedUnion("status", [
    z.object({ status: z.literal("active"), value: valueSchema }),
    z.object({ status: z.literal("missing") }),
  ]);
}

type TieredCacheOptions<V> = {
  /** Identifies this cache in invalidation messages, so servers evict from the right one. */
  name: string;
  invalidator: CacheInvalidator;
  /** In-memory cache on this server. */
  l1: LRUCache<CacheEntry<V>>;
  /** Redis, shared by all servers. */
  l2: RedisCache<CacheEntry<V>>;
  /** Reads the source of truth (the database). Returns undefined if the key doesn't exist. */
  load: (key: string) => Promise<V | undefined>;
  /**
   * How long a `missing` entry lives at each level. Keep these short: a key that gets created
   * later is only found once its `missing` entry expires or is invalidated.
   */
  missingTtl: { l1Ms: number; l2Seconds: number };
};

/**
 * Read-through cache: L1 (memory), then L2 (Redis), then `load`. Keys that don't exist are
 * cached too, with a short TTL.
 *
 * Concurrent misses for the same key share a single L2 read and `load` call.
 */
export class TieredCache<V> {
  private readonly coalescer = new RequestCoalescer<V | undefined>();

  constructor(private readonly options: TieredCacheOptions<V>) {
    // Another server (or this one) invalidated the key, so drop our in-memory copy.
    options.invalidator.onInvalidate(options.name, (key) => options.l1.delete(key));
  }

  async get(key: string): Promise<V | undefined> {
    const cached = this.options.l1.get(key);
    if (cached) return valueOf(cached);

    return this.coalescer.run(key, () => this.loadMiss(key));
  }

  /**
   * Drops the key from both levels on every server, so the next `get` reads from the source.
   * Call it after the change to the source has been committed.
   */
  async delete(key: string): Promise<void> {
    this.options.l1.delete(key);
    await this.options.l2.delete(key);
    await this.options.invalidator.publish(this.options.name, key);
  }

  private async loadMiss(key: string): Promise<V | undefined> {
    const { l1, l2, load, missingTtl } = this.options;

    const fromL2 = await l2.get(key);
    if (fromL2) {
      l1.set(key, fromL2, fromL2.status === "missing" ? missingTtl.l1Ms : undefined);
      return valueOf(fromL2);
    }

    const value = await load(key);
    if (value === undefined) {
      const missing: CacheEntry<V> = { status: "missing" };
      l1.set(key, missing, missingTtl.l1Ms);
      await l2.set(key, missing, missingTtl.l2Seconds);
      return undefined;
    }

    const active: CacheEntry<V> = { status: "active", value };
    l1.set(key, active);
    await l2.set(key, active);
    return value;
  }
}

function valueOf<V>(entry: CacheEntry<V>): V | undefined {
  return entry.status === "active" ? entry.value : undefined;
}
