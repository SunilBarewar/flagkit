import type { CacheInvalidator } from "@/lib/cache/primitives/cache-invalidator.ts";
import type { LRUCache } from "@/lib/cache/primitives/lru-cache.ts";
import type { RedisCache } from "@/lib/cache/primitives/redis-cache.ts";
import { RequestCoalescer } from "@/lib/cache/primitives/request-coalescer.ts";

type TieredCacheOptions<V> = {
  /** Identifies this cache in invalidation messages, so servers evict from the right one. */
  name: string;
  invalidator: CacheInvalidator;
  /** In-memory cache on this server. */
  l1: LRUCache<V>;
  /** Redis, shared by all servers. */
  l2: RedisCache<V>;
  /** Reads the source of truth (the database). Returns undefined if the key doesn't exist. */
  load: (key: string) => Promise<V | undefined>;
};

/**
 * Read-through cache: L1 (memory), then L2 (Redis), then `load`. Only found values are cached.
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
    if (cached) return cached;

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
    const { l1, l2, load } = this.options;

    const fromL2 = await l2.get(key);
    if (fromL2) {
      l1.set(key, fromL2);
      return fromL2;
    }

    const value = await load(key);
    if (!value) return undefined;

    l1.set(key, value);
    await l2.set(key, value);
    return value;
  }
}
