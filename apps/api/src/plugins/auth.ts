import { findProjectByApiKeyId } from "@flagkit/db";
import { ErrorCode, UnauthorizedError } from "@flagkit/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { hashApiKey, parseApiKeyId, verifyApiKey } from "@/lib/api-key.ts";
import { apiKeyCache, type ApiKeyCacheEntry } from "@/lib/api-key-cache.ts";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie.ts";
import { verifyAccountToken } from "@/lib/jwt.ts";

const API_KEY_HEADER = "x-api-key";

// Compared against when the key is malformed or unknown so response time doesn't reveal which keys exist.
const DUMMY_API_KEY_HASH = hashApiKey("flagkit-dummy-api-key");

/**
 * Verifies the session cookie and returns the account id.
 * Throws UnauthorizedError (-> 401 via the global error handler) if the cookie is
 * missing or the token is invalid/expired.
 */
async function getAccountId(request: FastifyRequest): Promise<string> {
  const token = request.cookies[AUTH_COOKIE_NAME];

  if (!token) {
    throw new UnauthorizedError("Not authenticated", { code: ErrorCode.UNAUTHORIZED });
  }

  try {
    return await verifyAccountToken(token);
  } catch (cause) {
    throw new UnauthorizedError("Invalid or expired session", {
      code: ErrorCode.UNAUTHORIZED,
      cause,
    });
  }
}

/**
 * Verifies the `x-api-key` header and returns the ids of the project it belongs to
 * and the account that owns that project.
 * Throws UnauthorizedError (-> 401) if the header is missing or the key is wrong.
 * Malformed, unknown and mismatched keys all get the same error, so a caller can't
 * tell which part was wrong.
 */
async function verifyApiKeyHeader(
  request: FastifyRequest,
): Promise<{ projectId: string; accountId: string }> {
  const apiKey = request.headers[API_KEY_HEADER];

  if (typeof apiKey !== "string" || apiKey === "") {
    throw new UnauthorizedError(`Missing ${API_KEY_HEADER} header`, {
      code: ErrorCode.UNAUTHORIZED,
    });
  }

  const apiKeyId = parseApiKeyId(apiKey);
  const entry = apiKeyId ? await lookupApiKey(apiKeyId) : undefined;
  const valid = verifyApiKey(apiKey, entry?.apiKeyHash ?? DUMMY_API_KEY_HASH);

  if (!entry || !valid) {
    throw new UnauthorizedError("Invalid API key", { code: ErrorCode.UNAUTHORIZED });
  }

  return { projectId: entry.projectId, accountId: entry.accountId };
}

/** L1 cache first, then the database. Only found keys are cached. */
async function lookupApiKey(apiKeyId: string): Promise<ApiKeyCacheEntry | undefined> {
  const cached = apiKeyCache.get(apiKeyId);
  if (cached) return cached;

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

declare module "fastify" {
  interface FastifyRequest {
    /** Set by `app.authenticate` or `app.authenticateApiKey`; only defined on routes that run one of those hooks. */
    accountId: string;
    /** Set by `app.authenticateApiKey`; only defined on routes that run that hook. */
    projectId: string;
  }
  interface FastifyInstance {
    /** Use as a route/plugin hook: `onRequest: app.authenticate`. */
    authenticate: (request: FastifyRequest) => Promise<void>;
    /** For SDK routes, authenticates with the project API key: `onRequest: app.authenticateApiKey`. */
    authenticateApiKey: (request: FastifyRequest) => Promise<void>;
  }
}

// fastify-plugin disables encapsulation so the decorators are visible to sibling plugins (routes).
export const registerAuth = fp(async (app: FastifyInstance) => {
  app.decorateRequest("accountId", "");
  app.decorateRequest("projectId", "");

  app.decorate("authenticate", async (request: FastifyRequest) => {
    request.accountId = await getAccountId(request);
  });

  app.decorate("authenticateApiKey", async (request: FastifyRequest) => {
    const { projectId, accountId } = await verifyApiKeyHeader(request);
    request.projectId = projectId;
    request.accountId = accountId;
  });
});
