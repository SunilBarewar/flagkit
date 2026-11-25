import type { ProjectResponse } from "@flagkit/shared/schemas";
import { createContext, use } from "react";
import { paths } from "@/routes/paths";

export interface ProjectContextValue {
  /** The project in the URL. */
  project: ProjectResponse;
  projects: ProjectResponse[];
}

export const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useCurrentProject() {
  const value = use(ProjectContext);
  if (!value) throw new Error("useCurrentProject must be used inside <ProjectProvider>");
  return value;
}

/** Links within the current project. */
export function useProjectPaths() {
  const { project } = useCurrentProject();
  return {
    flags: paths.flags(project.id),
    newFlag: paths.newFlag(project.id),
    flag: (flagId: string) => paths.flag(project.id, flagId),
    flagTest: (flagId: string) => paths.flagTest(project.id, flagId),
  };
}
