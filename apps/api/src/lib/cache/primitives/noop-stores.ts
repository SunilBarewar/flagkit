import type { Invalidator, L1Store, L2Store } from "@/lib/cache/primitives/stores.ts";

/**
 * Stand-ins for a level that is turned off. They never hold anything, so every read is a miss
 * and every write does nothing, and `TieredCache` doesn't need to know the level is missing.
 */
export class NoopL1Cache<V> implements L1Store<V> {
  get(): V | undefined {
    return undefined;
  }
  set(): void {}
  delete(): void {}
}

export class NoopL2Cache<V> implements L2Store<V> {
  async get(): Promise<V | undefined> {
    return undefined;
  }
  async set(): Promise<void> {}
  async delete(): Promise<void> {}
}

export class NoopInvalidator implements Invalidator {
  onInvalidate(): void {}
  async publish(): Promise<void> {}
}
