import { ApiErrorResponse } from "@flagkit/shared/schemas";
import type { PaginationMeta } from "@flagkit/shared/schemas";
import axios, { isAxiosError } from "axios";
import type { AxiosRequestConfig } from "axios";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/** Shared axios instance. The session lives in an httpOnly cookie, so credentials are always sent. */
export const http = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/** Every failed request surfaces as this. Switch on `code`, never on `message`. */
export class ApiError extends Error {
  readonly status: number | undefined;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, { status, code, details }: Omit<ApiError, "name" | "message">) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const isApiError = (err: unknown): err is ApiError => err instanceof ApiError;

http.interceptors.response.use(
  (response) => response,
  (err: unknown) => {
    if (!isAxiosError(err)) throw err;

    const body = ApiErrorResponse.safeParse(err.response?.data);
    if (body.success) {
      throw new ApiError(body.data.message, {
        status: err.response?.status,
        code: body.data.error.code,
        details: body.data.error.details,
      });
    }

    // No response (offline, CORS, server down) or a non-envelope response.
    throw new ApiError(err.response ? "Unexpected server response" : "Cannot reach the server", {
      status: err.response?.status,
      code: err.response ? "UNEXPECTED_RESPONSE" : "NETWORK_ERROR",
    });
  },
);

interface Envelope<T> {
  message: string;
  data: T;
}

export interface Page<T> {
  data: T[];
  pagination: PaginationMeta;
}

/** Sends a request and returns the envelope's `data`. */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await http.request<Envelope<T>>(config);
  return response.data.data;
}

/** Same, for paginated routes: returns `{ data, pagination }`. */
export async function requestPage<T>(config: AxiosRequestConfig): Promise<Page<T>> {
  const response = await http.request<Page<T> & { message: string }>(config);
  return { data: response.data.data, pagination: response.data.pagination };
}
