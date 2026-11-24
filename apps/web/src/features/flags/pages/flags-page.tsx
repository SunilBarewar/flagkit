import { Loader2, Plus } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useCurrentProject } from "@/features/projects/project-context";
import { paths } from "@/routes/paths";
import { FlagRow } from "../components/flag-row";
import { FlagsEmptyState } from "../components/flags-empty-state";
import { useFlags, useToggleFlag } from "../hooks";

export function FlagsPage() {
  const { project } = useCurrentProject();
  const { data: flags, isPending, isError, refetch } = useFlags(project.id);
  const toggle = useToggleFlag(project.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Feature flags</h1>
        </div>
        {flags && flags.length > 0 && (
          <Button asChild>
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
          <ul className="divide-y rounded-xl border bg-card shadow-card">
            {flags.map((flag) => (
              <FlagRow
                key={flag.id}
                flag={flag}
                disabled={toggle.isPending && toggle.variables.flagId === flag.id}
                onToggle={(isActive) => toggle.mutate({ flagId: flag.id, isActive })}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
