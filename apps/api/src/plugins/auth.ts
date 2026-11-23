import { findProjectByApiKeyId } from "@flagkit/db";
import { ErrorCode, UnauthorizedError } from "@flagkit/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { hashApiKey, parseApiKeyId, verifyApiKey } from "@/lib/api-key.ts";
import { verifyAccountToken } from "@/lib/jwt.ts";

const BEARER_PREFIX = "Bearer ";
const API_KEY_HEADER = "x-api-key";

// Compared against when the key is malformed or unknown so response time doesn't reveal which keys exist.
const DUMMY_API_KEY_HASH = hashApiKey("flagkit-dummy-api-key");

/**
 * Verifies the `Authorization: Bearer <token>` header and returns the account id.
 * Throws UnauthorizedError (-> 401 via the global error handler) if the header is
 * missing/malformed or the token is invalid/expired.
 */
async function getAccountId(request: FastifyRequest): Promise<string> {
  const header = request.headers.authorization;

  if (!header?.startsWith(BEARER_PREFIX)) {
    throw new UnauthorizedError("Missing or malformed Authorization header", {
      code: ErrorCode.UNAUTHORIZED,
    });
  }

  const token = header.slice(BEARER_PREFIX.length).trim();

  try {
    return await verifyAccountToken(token);
  } catch (cause) {
    throw new UnauthorizedError("Invalid or expired token", {
      code: ErrorCode.UNAUTHORIZED,
      cause,
    });
  }
}

/**
 * Verifies the `x-api-key` header and returns the id of the project it belongs to.
 * Throws UnauthorizedError (-> 401) if the header is missing or the key is wrong.
 * Malformed, unknown and mismatched keys all get the same error, so a caller can't
 * tell which part was wrong.
 */
async function getProjectId(request: FastifyRequest): Promise<string> {
  const apiKey = request.headers[API_KEY_HEADER];

  if (typeof apiKey !== "string" || apiKey === "") {
    throw new UnauthorizedError(`Missing ${API_KEY_HEADER} header`, {
      code: ErrorCode.UNAUTHORIZED,
    });
  }

  const apiKeyId = parseApiKeyId(apiKey);
  const project = apiKeyId ? await findProjectByApiKeyId(apiKeyId) : undefined;
  const valid = verifyApiKey(apiKey, project?.apiKeyHash ?? DUMMY_API_KEY_HASH);

  if (!project || !valid) {
    throw new UnauthorizedError("Invalid API key", { code: ErrorCode.UNAUTHORIZED });
  }

  return project.id;
}

declare module "fastify" {
  interface FastifyRequest {
    /** Set by `app.authenticate`; only defined on routes that run that hook. */
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
    request.projectId = await getProjectId(request);
  });
});
