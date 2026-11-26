import { findProjectByApiKeyId } from "@flagkit/db";
import { z } from "zod";

import { LRUCache } from "@/lib/cache/lru-cache.ts";
import { redis } from "@/lib/cache/redis.ts";
import { RedisCache } from "@/lib/cache/redis-cache.ts";
import { RequestCoalescer } from "@/lib/cache/request-coalescer.ts";

/**
 * Two-level cache for API key lookups, keyed by the public `apiKeyId`, never the full key.
 * L1 is in memory on this server, L2 is Redis shared by all servers.
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

const l1 = new LRUCache<ApiKeyCacheEntry>(L1_TTL_MS, L1_MAX_ENTRIES);
const redisCache = new RedisCache<ApiKeyCacheEntry>(redis, {
  prefix: "apikey",
  ttlSeconds: L2_TTL_SECONDS,
  schema: ApiKeyCacheEntrySchema,
});

const coalescer = new RequestCoalescer<ApiKeyCacheEntry | undefined>();

/**
 * Fetch api key from external serives after l1 cache miss
 */
async function load(apiKeyId: string): Promise<ApiKeyCacheEntry | undefined> {
  const fromRedis = await redisCache.get(apiKeyId);
  if (fromRedis) {
    l1.set(apiKeyId, fromRedis);
    return fromRedis;
  }

  const project = await findProjectByApiKeyId(apiKeyId);
  if (!project) return undefined;

  const entry = {
    projectId: project.id,
    accountId: project.accountId,
    apiKeyHash: project.apiKeyHash,
  };
  l1.set(apiKeyId, entry);
  await redisCache.set(apiKeyId, entry);
  return entry;
}

/**
 * L1, then Redis, then the database. Only found keys are cached.
 * Concurrent misses for the same key share a single Redis read and database query.
 */
export async function lookupApiKey(apiKeyId: string): Promise<ApiKeyCacheEntry | undefined> {
  const cached = l1.get(apiKeyId);
  if (cached) return cached;

  return coalescer.run(apiKeyId, () => load(apiKeyId));
}

/** Drops an entry from both levels so the next request reads from the database. */
export async function evictApiKey(apiKeyId: string): Promise<void> {
  l1.delete(apiKeyId);
  await redisCache.delete(apiKeyId);
}
