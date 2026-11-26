# API key verification (v1)

How the flag evaluation API verifies the API key on each request, and why this first version won't hold up at scale.

## API key format

Keys look like `fk_<apiKeyId>_<secret>` (see [api-key.ts](../apps/api/src/lib/api-key.ts)).

- `apiKeyId` is public. It is stored in plaintext and used to find the project.
- `secret` is never stored. Only an HMAC-SHA256 of the whole key (peppered) is stored as `apiKeyHash`.

## v1 flow

The `authenticateApiKey` hook ([auth.ts](../apps/api/src/plugins/auth.ts)) runs on `onRequest` for the evaluate routes. It does a database lookup on **every** request.

```mermaid
flowchart LR
    A[Request with x-api-key] --> B[(DB lookup by apiKeyId)]
    B --> C{Key valid?}
    C -- yes --> D[Evaluation controller]
    C -- no --> E[401]
```

On success the hook sets `request.projectId` and `request.accountId`. Malformed, unknown and mismatched keys all return the same 401.

## The problem

Let's say, evaluation traffic is around **10K requests per second**.
With a database lookup on every request:

- Each evaluation pays a database round trip before any work starts.
- The database load grows one-to-one with evaluation traffic, even though the key-to-project mapping rarely changes.
- The evaluate endpoint's availability and latency depend on the database.

We need to verify keys without querying the database on every request.

## V2 flow

To avoid hitting the database on every request, v2 adds a two-level cache in front of it.

- **L1:** in-memory cache on each API server.
- **L2:** Redis, shared by all API servers.

On each request we check L1 first. On a miss we check Redis. If Redis also misses, we read from the database and save the result in both caches.

```mermaid
flowchart LR
    A[Request with x-api-key] --> B{L1 memory}
    B -- hit --> F[Verify key]
    B -- miss --> C{L2 Redis}
    C -- hit --> F
    C -- miss --> D[(Database)]
    D -- save to L1 and L2 --> F
    F --> G[Evaluation controller]
```

## Cache schema

**Key**

```
apikey:<apiKeyId>
```

It uses the public `apiKeyId`, never the full key, so no secret ends up in Redis keys or logs. L1 and L2 use the same key.

**Value**

```ts
type ApiKeyCacheEntry =
  | { status: "active"; projectId: string; accountId: string; apiKeyHash: string }
  | { status: "missing" };
```

- `active` has everything the verification needs. We still compare the HMAC of the presented key against `apiKeyHash` on every request. That's cheap and in-process, so the cache only replaces the database lookup.
- `missing` is for well-formed `apiKeyId`s that aren't in the database. It stops random keys from hitting the database on every request.

In Redis the value is stored as a JSON string.

**TTLs**

| Entry     | L1 (memory) | L2 (Redis) |
| --------- | ----------- | ---------- |
| `active`  | 30s         | 10 min     |
| `missing` | 10s         | 30s        |

L1 has a max size (LRU), so a flood of different keys can't grow memory.

**Revocation**

When a key is rotated or a project is deleted, we delete the key from Redis and publish the `apiKeyId` on a pub/sub channel so every server evicts it from L1. If that message is missed, a revoked key can still work for at most the L1 TTL (30s). That's the delay we accept.

We'll build this gradually, starting with the L1 and L2 lookup, then negative caching and pub/sub invalidation.
