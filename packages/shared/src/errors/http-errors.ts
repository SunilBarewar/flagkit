import { ErrorCode } from "../constants/error-codes.ts";
import { HttpStatus } from "../constants/http-status.ts";
import { AppError, type AppErrorOptions } from "./app-error.ts";

type Options = Omit<AppErrorOptions, "code"> & { code?: string };

export class BadRequestError extends AppError {
  constructor(message = "Bad request", options: Options = {}) {
    super(message, HttpStatus.BAD_REQUEST, { code: ErrorCode.BAD_REQUEST, ...options });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", options: Options = {}) {
    super(message, HttpStatus.UNAUTHORIZED, { code: ErrorCode.UNAUTHORIZED, ...options });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", options: Options = {}) {
    super(message, HttpStatus.FORBIDDEN, { code: ErrorCode.FORBIDDEN, ...options });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", options: Options = {}) {
    super(message, HttpStatus.NOT_FOUND, { code: ErrorCode.NOT_FOUND, ...options });
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", options: Options = {}) {
    super(message, HttpStatus.CONFLICT, { code: ErrorCode.CONFLICT, ...options });
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", options: Options = {}) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, {
      code: ErrorCode.VALIDATION_FAILED,
      ...options,
    });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests", options: Options = {}) {
    super(message, HttpStatus.TOO_MANY_REQUESTS, { code: ErrorCode.TOO_MANY_REQUESTS, ...options });
  }
}

export class InternalError extends AppError {
  constructor(message = "Internal server error", options: Options = {}) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, {
      code: ErrorCode.INTERNAL_ERROR,
      ...options,
    });
  }
}
