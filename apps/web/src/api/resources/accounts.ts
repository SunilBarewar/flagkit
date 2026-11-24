import type { AccountResponse, UpdateAccountBody } from "@flagkit/shared/schemas";
import { request } from "../http.ts";

export const accounts = {
  get: (id: string) => request<AccountResponse>({ method: "GET", url: `/accounts/${id}` }),

  update: (id: string, body: UpdateAccountBody) =>
    request<AccountResponse>({ method: "PATCH", url: `/accounts/${id}`, data: body }),

  delete: (id: string) => request<null>({ method: "DELETE", url: `/accounts/${id}` }),
};
