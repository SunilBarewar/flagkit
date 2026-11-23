import { z } from "zod";

/** Shape of every error response (produced by the API's global error handler). */
export const ErrorResponse = z.object({
  error: z.string(),
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;

export const MessageResponse = z.object({ message: z.string() });
export type MessageResponse = z.infer<typeof MessageResponse>;

export const IdParams = z.object({ id: z.uuid() });
export type IdParams = z.infer<typeof IdParams>;
