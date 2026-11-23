import { ErrorCode } from "../constants/error-codes.ts";
import { HttpStatus } from "../constants/http-status.ts";
import type { ApiErrorResponse } from "../schemas/response.ts";

export interface AppErrorOptions {
  /** Machine-readable error code, e.g. "EMAIL_ALREADY_EXISTS". */
  code?: string;
  /** Extra structured info safe to return to the client. */
  details?: unknown;
  cause?: unknown;
}

/**
 * Base class for all expected (operational) errors. Carries an HTTP status
 * code so the API can map it straight to a response, while the worker can
 * simply log or retry based on `code`.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    { code = ErrorCode.INTERNAL_ERROR, details, cause }: AppErrorOptions = {},
  ) {
    super(message, { cause });
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  /** The API error envelope: `{ message, error: { code, details? } }`. */
  toJSON(): ApiErrorResponse {
    return {
      message: this.message,
      error: {
        code: this.code,
        ...(this.details !== undefined && { details: this.details }),
      },
    };
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
