import { Loader2, Plus } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useCurrentProject } from "@/features/projects/project-context";
import { paths } from "@/routes/paths";
import { FlagsEmptyState } from "../components/flags-empty-state";
import { FlagsTable } from "../components/flags-table";
import { useFlags, useToggleFlag } from "../hooks";

export function FlagsPage() {
  const { project } = useCurrentProject();
  const { data: flags, isPending, isError, refetch } = useFlags(project.id);
  const toggle = useToggleFlag(project.id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-4">
      <div className="flex min-h-10 items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Feature flags</h1>
        </div>
        {flags && flags.length > 0 && (
          <Button asChild className="h-11">
            <Link to={paths.newFlag}>
              <Plus /> Create feature flag
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-8">
        {isPending && (
          <div className="flex justify-center py-20 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <p>Couldn't load your flags.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        {flags && flags.length === 0 && <FlagsEmptyState />}

        {flags && flags.length > 0 && (
          <FlagsTable
            flags={flags}
            onToggle={(flagId, enabled) => toggle.mutate({ flagId, enabled })}
            isToggling={(flagId) => toggle.isPending && toggle.variables.flagId === flagId}
          />
        )}
      </div>
    </main>
  );
}
