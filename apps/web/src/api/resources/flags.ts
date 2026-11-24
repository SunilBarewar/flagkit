import type {
  CreateFlagBody,
  FlagResponse,
  PaginationQuery,
  UpdateFlagBody,
} from "@flagkit/shared/schemas";
import { request, requestPage } from "../http.ts";

/** Fields with a server-side default are optional for the caller. */
export type CreateFlagInput = Pick<CreateFlagBody, "key" | "type"> &
  Partial<Omit<CreateFlagBody, "key" | "type">>;

const base = (projectId: string) => `/projects/${projectId}/flags`;

export const flags = {
  list: (projectId: string, params?: Partial<PaginationQuery>) =>
    requestPage<FlagResponse>({ method: "GET", url: base(projectId), params }),

  get: (projectId: string, flagId: string) =>
    request<FlagResponse>({ method: "GET", url: `${base(projectId)}/${flagId}` }),

  create: (projectId: string, body: CreateFlagInput) =>
    request<FlagResponse>({ method: "POST", url: base(projectId), data: body }),

  update: (projectId: string, flagId: string, body: UpdateFlagBody) =>
    request<FlagResponse>({ method: "PATCH", url: `${base(projectId)}/${flagId}`, data: body }),

  delete: (projectId: string, flagId: string) =>
    request<null>({ method: "DELETE", url: `${base(projectId)}/${flagId}` }),
};
