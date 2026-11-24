import { accounts } from "./resources/accounts.ts";
import { auth } from "./resources/auth.ts";
import { flags } from "./resources/flags.ts";
import { projects } from "./resources/projects.ts";

/**
 * The single entry point to the API:
 *
 *   await apiClient.auth.login({ email, password });
 *   const { data, pagination } = await apiClient.flags.list(projectId);
 */
export const apiClient = { auth, accounts, projects, flags };

export { ApiError, isApiError } from "./http.ts";
export type { CreateFlagInput } from "./resources/flags.ts";
export type { Page } from "./http.ts";
