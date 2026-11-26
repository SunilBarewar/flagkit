import type { Redis } from "ioredis";
import type { z } from "zod";

type RedisCacheOptions<V> = {
  /** Keys are stored as `<prefix>:<key>`. */
  prefix: string;
  ttlSeconds: number;
  /** Values are stored as JSON and checked against this schema when read. */
  schema: z.ZodType<V>;
};

/**
 * Redis-backed cache (L2), shared by all API servers.
 *
 * Redis is only a cache, so every method is best effort and never throws: a failure (Redis
 * down, timeout, bad value) is a miss on read and a no-op on write and delete.
 */
export class RedisCache<V> {
  constructor(
    private readonly redis: Redis,
    private readonly options: RedisCacheOptions<V>,
  ) {}

  async get(key: string): Promise<V | undefined> {
    try {
      const raw = await this.redis.get(this.redisKey(key));
      if (!raw) return undefined;
      return this.options.schema.parse(JSON.parse(raw));
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: V): Promise<void> {
    try {
      await this.redis.set(
        this.redisKey(key),
        JSON.stringify(value),
        "EX",
        this.options.ttlSeconds,
      );
    } catch {
      // Not cached in Redis, the next miss reads the source again.
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(this.redisKey(key));
    } catch {
      // The entry expires on its own after the TTL.
    }
  }

  private redisKey(key: string): string {
    return `${this.options.prefix}:${key}`;
  }
}
