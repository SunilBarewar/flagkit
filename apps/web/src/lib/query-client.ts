import { QueryCache, QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/api";
import { setSession, sessionKey } from "@/features/auth/session";

export const queryClient: QueryClient = new QueryClient({
  // A 401 on any query means the cookie expired: show as logged out so the guards redirect.
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (isApiError(error) && error.status === 401 && query.queryKey[0] !== sessionKey[0]) {
        setSession(queryClient, null);
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
