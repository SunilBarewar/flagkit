import { z } from "zod";

/**
 * The envelope every API response uses.
 *
 *   success:    { message, data }
 *   paginated:  { message, data: [...], pagination }
 *   error:      { message, error: { code, details? } }
 *
 * `message` is a human-readable sentence. Clients should switch on `error.code`,
 * never on `message`.
 */

export const PaginationMeta = z.object({
  page: z.int().min(1),
  limit: z.int().min(1),
  total: z.int().min(0),
  totalPages: z.int().min(0),
});
export type PaginationMeta = z.infer<typeof PaginationMeta>;

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

/** Querystring for any paginated list route: `?page=2&limit=50`. */
export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});
export type PaginationQuery = z.infer<typeof PaginationQuery>;

/** Wrap a data schema in the success envelope: `apiSuccessSchema(ProjectResponse)`. */
export const apiSuccessSchema = <T extends z.ZodType>(data: T) =>
  z.object({ message: z.string(), data });

/** Wrap an item schema in the paginated envelope: `apiPaginatedSchema(ProjectResponse)`. */
export const apiPaginatedSchema = <T extends z.ZodType>(item: T) =>
  z.object({ message: z.string(), data: z.array(item), pagination: PaginationMeta });

export const ApiErrorResponse = z.object({
  message: z.string(),
  error: z.object({
    code: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponse>;

export interface ApiSuccessResponse<T> {
  message: string;
  data: T;
}

export interface ApiPaginatedResponse<T> {
  message: string;
  data: T[];
  pagination: PaginationMeta;
}
