import type { ProjectResponse } from "@flagkit/shared/schemas";
import { createContext, use } from "react";

export interface ProjectContextValue {
  /** The selected project: the default one until the user picks another. */
  project: ProjectResponse;
  projects: ProjectResponse[];
  select: (id: string) => void;
}

export const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useCurrentProject() {
  const value = use(ProjectContext);
  if (!value) throw new Error("useCurrentProject must be used inside <ProjectProvider>");
  return value;
}
