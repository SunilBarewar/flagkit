import { ErrorCode, UnauthorizedError } from "@flagkit/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { verifyAccountToken } from "@/lib/jwt.ts";

const BEARER_PREFIX = "Bearer ";

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

declare module "fastify" {
  interface FastifyRequest {
    /** Set by `app.authenticate`; only defined on routes that run that hook. */
    accountId: string;
  }
  interface FastifyInstance {
    /** Use as a route/plugin hook: `onRequest: app.authenticate`. */
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
}

// fastify-plugin disables encapsulation so the decorators are visible to sibling plugins (routes).
export const registerAuth = fp(async (app: FastifyInstance) => {
  app.decorateRequest("accountId", "");

  app.decorate("authenticate", async (request: FastifyRequest) => {
    request.accountId = await getAccountId(request);
  });
});
