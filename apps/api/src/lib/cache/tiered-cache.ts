import type { LRUCache } from "@/lib/cache/lru-cache.ts";
import type { RedisCache } from "@/lib/cache/redis-cache.ts";
import { RequestCoalescer } from "@/lib/cache/request-coalescer.ts";

type TieredCacheOptions<V> = {
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

  constructor(private readonly options: TieredCacheOptions<V>) {}

  async get(key: string): Promise<V | undefined> {
    const cached = this.options.l1.get(key);
    if (cached) return cached;

    return this.coalescer.run(key, () => this.loadMiss(key));
  }

  /** Drops the key from both levels so the next `get` reads from the source. */
  async delete(key: string): Promise<void> {
    this.options.l1.delete(key);
    await this.options.l2.delete(key);
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
