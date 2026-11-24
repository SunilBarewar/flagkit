import { useQuery } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { AccountResponse } from "@flagkit/shared/schemas";
import { apiClient, isApiError } from "@/api";

/**
 * The session is an httpOnly cookie, so JS can't read it. Ask the API who we are instead,
 * and cache the answer: an account when logged in, null when not.
 */
export const sessionKey = ["session"] as const;

export const sessionQuery = {
  queryKey: sessionKey,
  queryFn: async (): Promise<AccountResponse | null> => {
    try {
      return await apiClient.auth.me();
    } catch (err) {
      if (isApiError(err) && err.status === 401) return null;
      throw err;
    }
  },
  staleTime: Infinity,
  retry: false,
} as const;

export const useSession = () => useQuery(sessionQuery);

export const setSession = (queryClient: QueryClient, account: AccountResponse | null) =>
  queryClient.setQueryData(sessionKey, account);
