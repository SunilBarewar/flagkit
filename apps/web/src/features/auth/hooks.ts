import type { CredentialsBody } from "@flagkit/shared/schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { apiClient } from "@/api";
import { paths } from "@/routes/paths";
import { setSession } from "./session";

export type AuthMode = "login" | "signup";

/** Logs in, or signs up and then logs in (signup doesn't start a session), then goes home. */
export function useAuthMutation(mode: AuthMode) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CredentialsBody) => {
      if (mode === "signup") await apiClient.auth.signup(body);
      return apiClient.auth.login(body);
    },
    onSuccess: (account) => {
      setSession(queryClient, account);
      navigate(paths.home, { replace: true });
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.auth.logout,
    // Leave even if the request fails: cached data is dropped and we show as logged out.
    onSettled: () => {
      queryClient.clear();
      setSession(queryClient, null);
      navigate(paths.login, { replace: true });
    },
  });
}
