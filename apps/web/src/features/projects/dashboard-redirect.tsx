import { Navigate } from "react-router";
import { paths } from "@/routes/paths";
import { pickProject, ProjectsGate } from "./projects-gate";

/** `/dashboard`: opens the last-used project, or the default one. */
export function DashboardRedirect() {
  return (
    <ProjectsGate>
      {(projects) => <Navigate to={paths.flags(pickProject(projects)!.id)} replace />}
    </ProjectsGate>
  );
}
