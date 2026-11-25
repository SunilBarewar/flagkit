import { DEFAULT_PROJECT_NAME } from "@flagkit/shared/constants";
import type { ProjectResponse } from "@flagkit/shared/schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { apiClient } from "@/api";
import { Button } from "@/components/ui/button";
import { projectsKey, useProjects } from "./hooks";

const LAST_PROJECT_KEY = "flagkit.selectedProjectId";

// Storage can be blocked or full (private windows, strict settings), and the app works without it.
export function readLastProjectId(): string | null {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

export function writeLastProjectId(id: string) {
  try {
    localStorage.setItem(LAST_PROJECT_KEY, id);
  } catch {
    // Not remembered after a reload, nothing else breaks.
  }
}

/** The project to open when the URL doesn't name one: the last-used, else the default, else the first. */
export function pickProject(projects: ProjectResponse[]): ProjectResponse | undefined {
  const lastId = readLastProjectId();
  return (
    projects.find((p) => p.id === lastId) ??
    projects.find((p) => p.name === DEFAULT_PROJECT_NAME) ??
    projects[0]
  );
}

/**
 * Loads the account's projects and renders `children` once there is at least one.
 * Covers loading, errors, and accounts created before every signup got a default project.
 */
export function ProjectsGate({
  children,
}: {
  children: (projects: ProjectResponse[]) => ReactNode;
}) {
  const { data: projects, isPending, isError, refetch } = useProjects();

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

  if (projects.length === 0) return <CreateDefaultProject />;

  return children(projects);
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
