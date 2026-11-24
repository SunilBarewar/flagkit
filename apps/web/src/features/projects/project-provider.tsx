import { DEFAULT_PROJECT_NAME } from "@flagkit/shared/constants";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { apiClient } from "@/api";
import { Button } from "@/components/ui/button";
import { projectsKey, useProjects } from "./hooks";
import { ProjectContext } from "./project-context";

/**
 * Loads the account's projects and selects the default one. Children only render once a
 * project is selected, so they can rely on `useCurrentProject()`.
 */
export function ProjectProvider({ children }: { children: ReactNode }) {
  const { data: projects, isPending, isError, refetch } = useProjects();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isPending)
    return (
      <FullPage>
        <Loader2 className="size-6 animate-spin" />
      </FullPage>
    );

  if (isError) {
    return (
      <FullPage>
        <p>Couldn't load your projects.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </FullPage>
    );
  }

  const project =
    projects.find((p) => p.id === selectedId) ??
    projects.find((p) => p.name === DEFAULT_PROJECT_NAME) ??
    projects[0];

  // Accounts created before every signup got a default project.
  if (!project) return <CreateDefaultProject />;

  return (
    <ProjectContext value={{ project, projects, select: setSelectedId }}>{children}</ProjectContext>
  );
}

function FullPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-muted-foreground">
      {children}
    </div>
  );
}

function CreateDefaultProject() {
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: () => apiClient.projects.create({ name: DEFAULT_PROJECT_NAME }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsKey }),
  });

  return (
    <FullPage>
      <p>You don't have a project yet.</p>
      <Button onClick={() => create.mutate()} disabled={create.isPending}>
        {create.isPending && <Loader2 className="animate-spin" />}
        Create {DEFAULT_PROJECT_NAME.toLowerCase()}
      </Button>
    </FullPage>
  );
}
