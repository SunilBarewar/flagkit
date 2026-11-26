import { findProjectByApiKeyId } from "@flagkit/db";

import { LRUCache } from "@/lib/cache/lru-cache.ts";

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

const apiKeyCache = new LRUCache<ApiKeyCacheEntry>(TTL_MS, MAX_ENTRIES);

// Database reads that are running right now. Concurrent misses for the same key share one.
const inFlight = new Map<string, Promise<ApiKeyCacheEntry | undefined>>();

async function loadFromDatabase(apiKeyId: string): Promise<ApiKeyCacheEntry | undefined> {
  const project = await findProjectByApiKeyId(apiKeyId);
  if (!project) return undefined;

  const entry = {
    projectId: project.id,
    accountId: project.accountId,
    apiKeyHash: project.apiKeyHash,
  };
  apiKeyCache.set(apiKeyId, entry);
  return entry;
}

/**
 * L1 cache first, then the database. Only found keys are cached.
 * Concurrent misses for the same key share a single database query.
 */
export async function lookupApiKey(apiKeyId: string): Promise<ApiKeyCacheEntry | undefined> {
  const cached = apiKeyCache.get(apiKeyId);
  if (cached) return cached;

  // No `await` between the check and the set below, so two requests can't both start a query.
  const pending = inFlight.get(apiKeyId);
  if (pending) return pending;

  // Removed on success and on failure, so a failed query isn't handed to later requests.
  const promise = loadFromDatabase(apiKeyId).finally(() => inFlight.delete(apiKeyId));
  inFlight.set(apiKeyId, promise);
  return promise;
}

/** Drops an entry so the next request reads from the database. */
export function evictApiKey(apiKeyId: string): void {
  apiKeyCache.delete(apiKeyId);
}
