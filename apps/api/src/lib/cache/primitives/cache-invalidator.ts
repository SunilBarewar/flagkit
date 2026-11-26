import type { Redis } from "ioredis";
import { z } from "zod";

const CHANNEL = "cache-invalidation";

const MessageSchema = z.object({ cache: z.string(), key: z.string() });

type InvalidateHandler = (key: string) => void;

/**
 * Tells every API server to drop a key from its in-memory (L1) cache, using Redis pub/sub.
 *
 * Messages are best effort. A server that misses one (disconnected, restarting) keeps the stale
 * entry until its L1 TTL expires, so the TTL is the upper bound on staleness.
 */
export class CacheInvalidator {
  private readonly handlers = new Map<string, Set<InvalidateHandler>>();

  constructor(
    private readonly publisher: Redis,
    subscriber: Redis,
  ) {
    subscriber.on("message", (_channel, raw) => this.handleMessage(raw));
    // Re-subscribes on its own after a reconnect.
    subscriber.subscribe(CHANNEL).catch((error: Error) => {
      console.error("redis subscribe failed:", error.message);
    });
  }

  /** Calls `handler` with the key whenever any server (including this one) invalidates it. */
  onInvalidate(cache: string, handler: InvalidateHandler): void {
    const set = this.handlers.get(cache) ?? new Set();
    set.add(handler);
    this.handlers.set(cache, set);
  }

  async publish(cache: string, key: string): Promise<void> {
    try {
      await this.publisher.publish(CHANNEL, JSON.stringify({ cache, key }));
    } catch {
      // Other servers keep the entry until their L1 TTL expires.
    }
  }

  private handleMessage(raw: string): void {
    const parsed = MessageSchema.safeParse(safeJsonParse(raw));
    if (!parsed.success) return;

    for (const handler of this.handlers.get(parsed.data.cache) ?? []) {
      handler(parsed.data.key);
    }
  }
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
