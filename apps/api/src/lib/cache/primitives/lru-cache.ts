import type { L1Store } from "@/lib/cache/primitives/stores.ts";

type Stored<V> = { value: V; expiresAt: number };

/**
 * In-memory LRU cache with a TTL. Per-process, not shared between servers.
 *
 * A Map iterates in insertion order, so the first key is always the least recently used.
 * Reading or writing a key re-inserts it to move it to the end.
 */
export class LRUCache<V> implements L1Store<V> {
  private readonly store = new Map<string, Stored<V>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
  ) {}

  get(key: string): V | undefined {
    const stored = this.store.get(key);
    if (!stored) return undefined;

    if (stored.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    this.store.delete(key);
    this.store.set(key, stored);
    return stored.value;
  }

  /** `ttlMs` overrides the default TTL for this entry. */
  set(key: string, value: V, ttlMs: number = this.ttlMs): void {
    this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });

    if (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}
