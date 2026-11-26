import { findProjectByApiKeyId } from "@flagkit/db";
import { z } from "zod";

import { LRUCache } from "@/lib/cache/lru-cache.ts";
import { redis } from "@/lib/cache/redis.ts";
import { RedisCache } from "@/lib/cache/redis-cache.ts";
import { TieredCache } from "@/lib/cache/tiered-cache.ts";

/**
 * Cache for API key lookups, keyed by the public `apiKeyId`, never the full key.
 * See docs/api-key-verification.md.
 *
 * We cache the stored hash and still verify the presented key against it on every request,
 * so a hit only replaces the DB lookup.
 */
const ApiKeyCacheEntrySchema = z.object({
  projectId: z.string(),
  accountId: z.string(),
  apiKeyHash: z.string(),
});

export type ApiKeyCacheEntry = z.infer<typeof ApiKeyCacheEntrySchema>;

const L1_TTL_MS = 30_000;
const L1_MAX_ENTRIES = 10_000;
const L2_TTL_SECONDS = 10 * 60;

const apiKeyCache = new TieredCache<ApiKeyCacheEntry>({
  l1: new LRUCache(L1_TTL_MS, L1_MAX_ENTRIES),
  l2: new RedisCache(redis, {
    prefix: "apikey",
    ttlSeconds: L2_TTL_SECONDS,
    schema: ApiKeyCacheEntrySchema,
  }),
  load: async (apiKeyId) => {
    const project = await findProjectByApiKeyId(apiKeyId);
    if (!project) return undefined;

    return {
      projectId: project.id,
      accountId: project.accountId,
      apiKeyHash: project.apiKeyHash,
    };
  },
});

export function lookupApiKey(apiKeyId: string): Promise<ApiKeyCacheEntry | undefined> {
  return apiKeyCache.get(apiKeyId);
}

/** Drops an entry from both levels so the next request reads from the database. */
export function evictApiKey(apiKeyId: string): Promise<void> {
  return apiKeyCache.delete(apiKeyId);
}
