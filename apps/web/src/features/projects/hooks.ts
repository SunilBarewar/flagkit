import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api";

export const projectsKey = ["projects"] as const;

// 100 is the API's page limit, plenty until accounts have that many projects.
export const useProjects = () =>
  useQuery({
    queryKey: projectsKey,
    queryFn: () => apiClient.projects.list({ limit: 100 }).then((page) => page.data),
  });
