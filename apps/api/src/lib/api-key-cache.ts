import { LRUCache } from "@/lib/lru-cache.ts";

/**
 * L1 cache for API key lookups, keyed by the public `apiKeyId`, never the full key.
 * See docs/api-key-verification.md.
 *
 * We cache the stored hash and still verify the presented key against it on every request,
 * so a hit only replaces the DB lookup.
 */
export type ApiKeyCacheEntry = {
  projectId: string;
  accountId: string;
  apiKeyHash: string;
};

const TTL_MS = 30_000;
const MAX_ENTRIES = 10_000;

export const apiKeyCache = new LRUCache<ApiKeyCacheEntry>(TTL_MS, MAX_ENTRIES);
