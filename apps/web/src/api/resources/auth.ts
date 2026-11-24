import type { AccountResponse, CredentialsBody } from "@flagkit/shared/schemas";
import { request } from "../http.ts";

export const auth = {
  signup: (body: CredentialsBody) =>
    request<AccountResponse>({ method: "POST", url: "/accounts", data: body }),

  /** Sets the session cookie. */
  login: (body: CredentialsBody) =>
    request<AccountResponse>({ method: "POST", url: "/accounts/login", data: body }),

  logout: () => request<null>({ method: "POST", url: "/accounts/logout" }),
};
