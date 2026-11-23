import type {
  ApiErrorResponse,
  ApiPaginatedResponse,
  ApiSuccessResponse,
  PaginationMeta,
} from "@flagkit/shared/schemas";

/** `{ message, data }` */
export function successResponse<T>(message: string, data: T): ApiSuccessResponse<T> {
  return { message, data };
}

/** What a paginated query reports back: the page asked for, and the total row count. */
export interface PaginationInput {
  page: number;
  limit: number;
  total: number;
}

export function buildPagination({ page, limit, total }: PaginationInput): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

/** `{ message, data: [...], pagination }` */
export function paginatedResponse<T>(
  message: string,
  items: T[],
  pagination: PaginationInput,
): ApiPaginatedResponse<T> {
  return { message, data: items, pagination: buildPagination(pagination) };
}

export interface ErrorResponseInput {
  /** Machine-readable, e.g. "NOT_FOUND". Clients switch on this. */
  code: string;
  /** Extra structured info that is safe to return to the client. */
  details?: unknown;
}

/** `{ message, error: { code, details? } }` */
export function errorResponse(
  message: string,
  { code, details }: ErrorResponseInput,
): ApiErrorResponse {
  return { message, error: { code, ...(details !== undefined && { details }) } };
}
