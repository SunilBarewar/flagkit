import { findProjectByApiKeyId } from "@flagkit/db";
import { z } from "zod";

import { cacheInvalidator } from "@/lib/cache/invalidator.ts";
import { LRUCache } from "@/lib/cache/primitives/lru-cache.ts";
import { redis } from "@/lib/cache/redis.ts";
import { RedisCache } from "@/lib/cache/primitives/redis-cache.ts";
import {
  TieredCache,
  cacheEntrySchema,
  type CacheEntry,
} from "@/lib/cache/primitives/tiered-cache.ts";

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
// Short, so an unknown key that becomes valid isn't rejected for long.
const MISSING_L1_TTL_MS = 10_000;
const MISSING_L2_TTL_SECONDS = 30;

const apiKeyCache = new TieredCache<ApiKeyCacheEntry>({
  name: "apikey",
  invalidator: cacheInvalidator,
  l1: new LRUCache<CacheEntry<ApiKeyCacheEntry>>(L1_TTL_MS, L1_MAX_ENTRIES),
  l2: new RedisCache(redis, {
    prefix: "apikey",
    ttlSeconds: L2_TTL_SECONDS,
    schema: cacheEntrySchema(ApiKeyCacheEntrySchema),
  }),
  missingTtl: { l1Ms: MISSING_L1_TTL_MS, l2Seconds: MISSING_L2_TTL_SECONDS },
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
