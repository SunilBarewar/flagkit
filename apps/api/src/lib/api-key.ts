import { createHash, randomBytes } from "node:crypto";

const API_KEY_PREFIX = "hr_";

/** SHA-256 is enough here: API keys are long random strings, not user-chosen passwords. */
export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

/** The plaintext key is shown to the user once; only the hash is stored. */
export function generateApiKey(): { apiKey: string; apiKeyHash: string } {
  const apiKey = `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  return { apiKey, apiKeyHash: hashApiKey(apiKey) };
}
