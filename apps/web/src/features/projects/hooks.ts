import type { CreateProjectBody } from "@flagkit/shared/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api";

export const projectsKey = ["projects"] as const;

// 100 is the API's page limit, plenty until accounts have that many projects.
export const useProjects = () =>
  useQuery({
    queryKey: projectsKey,
    queryFn: () => apiClient.projects.list({ limit: 100 }).then((page) => page.data),
  });

/** The result carries the project's API key, which is only ever returned here. */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateProjectBody) => apiClient.projects.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsKey }),
  });
}

/** The result carries the new API key, which is only ever returned here. */
export function useRotateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => apiClient.projects.rotateApiKey(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsKey }),
  });
}
