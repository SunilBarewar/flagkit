import { useEffect } from "react";
import type { ReactNode } from "react";
import { Navigate, useParams } from "react-router";
import { paths } from "@/routes/paths";
import { ProjectContext } from "./project-context";
import { ProjectsGate, writeLastProjectId } from "./projects-gate";

/**
 * Provides the project named in the URL. An id that doesn't exist, or belongs to another account,
 * goes back to `/dashboard`, which picks a project for you.
 * Children only render once the project is found, so they can rely on `useCurrentProject()`.
 */
export function ProjectProvider({ children }: { children: ReactNode }) {
  const { projectId } = useParams();

  return (
    <ProjectsGate>
      {(projects) => {
        const project = projects.find((p) => p.id === projectId);
        if (!project) return <Navigate to={paths.dashboard} replace />;
        return (
          <RememberProject id={project.id}>
            <ProjectContext value={{ project, projects }}>{children}</ProjectContext>
          </RememberProject>
        );
      }}
    </ProjectsGate>
  );
}

/** Remembers the last project opened so `/dashboard` can return to it. */
function RememberProject({ id, children }: { id: string; children: ReactNode }) {
  useEffect(() => writeLastProjectId(id), [id]);
  return children;
}
