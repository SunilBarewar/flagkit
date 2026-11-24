import { Outlet } from "react-router";
import { AppHeader } from "@/components/layout/app-header";
import { ProjectProvider } from "@/features/projects/project-provider";

export function DashboardLayout() {
  return (
    <ProjectProvider>
      <AppHeader />
      <Outlet />
    </ProjectProvider>
  );
}
