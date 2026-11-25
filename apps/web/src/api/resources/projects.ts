import type {
  CreateProjectBody,
  CreateProjectResponse,
  PaginationQuery,
  ProjectResponse,
} from "@flagkit/shared/schemas";
import { request, requestPage } from "../http.ts";

export const projects = {
  list: (params?: Partial<PaginationQuery>) =>
    requestPage<ProjectResponse>({ method: "GET", url: "/projects", params }),

  /** The response is the only time the plaintext API key is ever returned. */
  create: (body: CreateProjectBody) =>
    request<CreateProjectResponse>({ method: "POST", url: "/projects", data: body }),

  /** The old key stops working at once. The new key is only returned in this response. */
  rotateApiKey: (projectId: string) =>
    request<CreateProjectResponse>({
      method: "POST",
      url: `/projects/${projectId}/api-key/rotate`,
    }),
};
