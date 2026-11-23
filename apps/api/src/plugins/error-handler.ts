import {
  AppError,
  ConflictError,
  ErrorCode,
  HttpStatus,
  ValidationError,
  isAppError,
  isDevelopment,
} from "@flagkit/shared";
import type { FastifyError, FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { errorResponse } from "@/utils/response.ts";

const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";

/** Drizzle wraps driver errors, so walk the `cause` chain to find the Postgres one. */
function findPostgresError(err: unknown): { code: string; constraint_name?: string } | undefined {
  let current: unknown = err;
  for (let depth = 0; current && depth < 5; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) {
      return current as { code: string; constraint_name?: string };
    }
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/** Translate known library errors into AppErrors; return undefined if unknown. */
function toAppError(err: unknown): AppError | undefined {
  if (isAppError(err)) return err;

  if (err instanceof ZodError) {
    return new ValidationError("Validation failed", {
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      cause: err,
    });
  }

  const pg = findPostgresError(err);
  if (pg?.code === PG_UNIQUE_VIOLATION) {
    return new ConflictError("Resource already exists", {
      code: ErrorCode.ALREADY_EXISTS,
      details: pg.constraint_name ? { constraint: pg.constraint_name } : undefined,
      cause: err,
    });
  }
  if (pg?.code === PG_FOREIGN_KEY_VIOLATION) {
    return new ValidationError("Referenced resource does not exist", {
      code: ErrorCode.INVALID_REFERENCE,
      cause: err,
    });
  }

  return undefined;
}

/** Global error handler. Register before the routes. */
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError, request, reply) => {
    if (isDevelopment()) {
      console.log(JSON.stringify(err, null, 2));
    }

    // Fastify's own JSON-schema validation (request body/params/querystring).
    if (err.validation) {
      return reply
        .code(HttpStatus.BAD_REQUEST)
        .send(errorResponse(err.message, { code: ErrorCode.BAD_REQUEST, details: err.validation }));
    }

    const appError = toAppError(err);
    if (appError) {
      if (appError.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR)
        request.log.error({ err }, "request failed");
      return reply
        .code(appError.statusCode)
        .send(errorResponse(appError.message, { code: appError.code, details: appError.details }));
    }

    // Other Fastify errors with a 4xx status (bad JSON, 404 payload too large, ...).
    if (err.statusCode && err.statusCode < HttpStatus.INTERNAL_SERVER_ERROR) {
      return reply
        .code(err.statusCode)
        .send(errorResponse(err.message, { code: err.code || ErrorCode.BAD_REQUEST }));
    }

    // Unknown: log everything, leak nothing.
    request.log.error({ err }, "unhandled error");
    return reply
      .code(HttpStatus.INTERNAL_SERVER_ERROR)
      .send(errorResponse("Internal server error", { code: ErrorCode.INTERNAL_ERROR }));
  });

  app.setNotFoundHandler((request, reply) =>
    reply.code(HttpStatus.NOT_FOUND).send(
      errorResponse(`Route ${request.method} ${request.url} not found`, {
        code: ErrorCode.NOT_FOUND,
      }),
    ),
  );
}
