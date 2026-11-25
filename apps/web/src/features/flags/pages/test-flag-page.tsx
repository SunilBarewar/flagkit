import { ChevronRight, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentProject, useProjectPaths } from "@/features/projects/project-context";
import { TestFlagWorkspace } from "../components/test-flag-workspace";
import { useFlag } from "../hooks";

export function TestFlagPage() {
  const links = useProjectPaths();
  const { flagId = "" } = useParams();
  const { project } = useCurrentProject();
  const { data: flag, isPending, isError } = useFlag(project.id, flagId);

  if (isPending) {
    return (
      <main className="flex justify-center py-20 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <p>Couldn't find this flag.</p>
        <Button asChild variant="outline">
          <Link to={links.flags}>Back to feature flags</Link>
        </Button>
      </main>
    );
  }

  return (
    <main>
      <div className="sticky top-14 z-30 border-b bg-background">
        <div className="flex h-14 items-center justify-between gap-4 px-4">
          <nav className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <Link to={links.flags} className="hover:text-foreground">
              Feature flags
            </Link>
            <ChevronRight className="size-4 shrink-0" />
            <Link to={links.flag(flag.id)} className="truncate hover:text-foreground">
              {flag.key}
            </Link>
            <ChevronRight className="size-4 shrink-0" />
            <span className="font-medium text-foreground">Test</span>
            <Badge variant="secondary" className="capitalize">
              {flag.type}
            </Badge>
          </nav>
          <Button asChild variant="outline">
            <Link to={links.flag(flag.id)}>Edit flag</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {!flag.enabled && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            This flag is switched off, so every test will be OFF. Switch it on in the flag's
            settings to test its rules.
          </p>
        )}

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <TestFlagWorkspace flag={flag} />
        </div>
      </div>
    </main>
  );
}
