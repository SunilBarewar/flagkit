import type {
  CreateFlagInput,
  FlagResponse,
  PaginationQuery,
  UpdateFlagBody,
  VariantInput,
  VariantResponse,
} from "@flagkit/shared/schemas";
import { request, requestPage } from "../http.ts";

export type { CreateFlagInput };

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

  replaceVariants: (projectId: string, flagId: string, variants: VariantInput[]) =>
    request<VariantResponse[]>({
      method: "PUT",
      url: `${base(projectId)}/${flagId}/variants`,
      data: { variants },
    }),

  delete: (projectId: string, flagId: string) =>
    request<null>({ method: "DELETE", url: `${base(projectId)}/${flagId}` }),
};
