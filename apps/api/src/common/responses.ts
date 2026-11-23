import { HttpStatus } from "@flagkit/shared";
import { z } from "zod";

/** Shape produced by the global error handler (see plugins/error-handler.ts). */
export const ErrorResponse = z.object({
  error: z.string(),
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export const MessageResponse = z.object({ message: z.string() });

/** Shown as a lock icon / "Authorize" box in the OpenAPI docs. */
export const security = [{ bearerAuth: [] }];

/** Responses every protected route can return. */
export const protectedErrorResponses = {
  [HttpStatus.UNAUTHORIZED]: ErrorResponse,
  [HttpStatus.FORBIDDEN]: ErrorResponse,
  [HttpStatus.NOT_FOUND]: ErrorResponse,
};
