import type { AccountResponse, CredentialsBody } from "@flagkit/shared/schemas";
import { request } from "../http.ts";

export const auth = {
  signup: (body: CredentialsBody) =>
    request<AccountResponse>({ method: "POST", url: "/accounts", data: body }),

  /** Sets the session cookie. */
  login: (body: CredentialsBody) =>
    request<AccountResponse>({ method: "POST", url: "/accounts/login", data: body }),

  /** The account the session cookie belongs to. Rejects with a 401 ApiError when logged out. */
  me: () => request<AccountResponse>({ method: "GET", url: "/accounts/me" }),

  logout: () => request<null>({ method: "POST", url: "/accounts/logout" }),
};
