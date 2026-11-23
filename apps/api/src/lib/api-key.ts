import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { Config } from "@/env.ts";

/**
 * Project API keys look like `fk_<apiKeyId>_<secret>`.
 *
 * - `apiKeyId` is public (stored in plaintext, used to find the project).
 * - `secret` is never stored. Only an HMAC of the whole key is.
 *
 * Both parts use base62, so neither can contain `_` and the key splits unambiguously.
 */
const API_KEY_PREFIX = "fk";
const API_KEY_ID_LENGTH = 10;
const API_KEY_SECRET_LENGTH = 32;
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const API_KEY_PATTERN = new RegExp(
  `^${API_KEY_PREFIX}_([0-9A-Za-z]{${API_KEY_ID_LENGTH}})_[0-9A-Za-z]{${API_KEY_SECRET_LENGTH}}$`,
);

/** `randomInt` is unbiased, unlike `byte % 62`. */
function randomBase62(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += BASE62[randomInt(BASE62.length)];
  return out;
}

/**
 * HMAC-SHA256 keyed with the server-side pepper, hex encoded. A leaked database
 * alone can't be used to check guesses. The pepper is only in the app environment.
 */
export function hashApiKey(apiKey: string): string {
  return createHmac("sha256", Config.API_KEY_PEPPER).update(apiKey).digest("hex");
}

/** The plaintext key is shown to the user once; only `apiKeyId` and `apiKeyHash` are stored. */
export function generateApiKey(): { apiKey: string; apiKeyId: string; apiKeyHash: string } {
  const apiKeyId = randomBase62(API_KEY_ID_LENGTH);
  const apiKey = `${API_KEY_PREFIX}_${apiKeyId}_${randomBase62(API_KEY_SECRET_LENGTH)}`;
  return { apiKey, apiKeyId, apiKeyHash: hashApiKey(apiKey) };
}

/** Returns the key's public ID, or null if the string isn't a well-formed API key. */
export function parseApiKeyId(apiKey: string): string | null {
  return API_KEY_PATTERN.exec(apiKey)?.[1] ?? null;
}

/** Constant-time check of a presented key against the stored hash. */
export function verifyApiKey(apiKey: string, apiKeyHash: string): boolean {
  const presented = Buffer.from(hashApiKey(apiKey), "hex");
  const stored = Buffer.from(apiKeyHash, "hex");
  return presented.length === stored.length && timingSafeEqual(presented, stored);
}
