import { HttpStatus } from "@flagkit/shared";
import { ErrorResponse } from "@flagkit/shared/schemas";

/** Shown as a lock icon / "Authorize" box in the OpenAPI docs. */
export const security = [{ bearerAuth: [] }];

/** Responses every protected route can return. */
export const protectedErrorResponses = {
  [HttpStatus.UNAUTHORIZED]: ErrorResponse,
  [HttpStatus.FORBIDDEN]: ErrorResponse,
  [HttpStatus.NOT_FOUND]: ErrorResponse,
};
