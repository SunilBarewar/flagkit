import { HttpStatus } from "@flagkit/shared";
import { ApiErrorResponse } from "@flagkit/shared/schemas";

/** Shown as a lock icon / "Authorize" box in the OpenAPI docs. */
export const security = [{ bearerAuth: [] }];

/** Responses every protected route can return. */
export const protectedErrorResponses = {
  [HttpStatus.UNAUTHORIZED]: ApiErrorResponse,
  [HttpStatus.FORBIDDEN]: ApiErrorResponse,
  [HttpStatus.NOT_FOUND]: ApiErrorResponse,
};
