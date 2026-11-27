/** What `TieredCache` needs from its in-memory level. */
export interface L1Store<V> {
  get(key: string): V | undefined;
  /** `ttlMs` overrides the default TTL for this entry. */
  set(key: string, value: V, ttlMs?: number): void;
  delete(key: string): void;
}

/** What `TieredCache` needs from its shared level. Never throws: a failure is a miss. */
export interface L2Store<V> {
  get(key: string): Promise<V | undefined>;
  /** `ttlSeconds` overrides the default TTL for this entry. */
  set(key: string, value: V, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

/** Tells the other servers to drop a key from their L1 cache. */
export interface Invalidator {
  /** Calls `handler` with the key whenever any server (including this one) invalidates it. */
  onInvalidate(cache: string, handler: (key: string) => void): void;
  publish(cache: string, key: string): Promise<void>;
}
