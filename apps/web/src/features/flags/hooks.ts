import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api";
import type { CreateFlagInput } from "@/api";

export const flagsKey = (projectId: string) => ["flags", projectId] as const;

// 100 is the API's page limit. Add paging when a project outgrows it.
export const useFlags = (projectId: string) =>
  useQuery({
    queryKey: flagsKey(projectId),
    queryFn: () => apiClient.flags.list(projectId, { limit: 100 }).then((page) => page.data),
  });

export function useToggleFlag(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ flagId, isActive }: { flagId: string; isActive: boolean }) =>
      apiClient.flags.update(projectId, flagId, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: flagsKey(projectId) }),
  });
}

export function useCreateFlag(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateFlagInput) => apiClient.flags.create(projectId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: flagsKey(projectId) }),
  });
}
