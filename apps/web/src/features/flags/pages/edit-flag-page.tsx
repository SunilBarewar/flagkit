import { Loader2 } from "lucide-react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { useCurrentProject } from "@/features/projects/project-context";
import { paths } from "@/routes/paths";
import { EditFlagForm } from "../components/edit-flag-form";
import { useFlag } from "../hooks";

export function EditFlagPage() {
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
          <Link to={paths.dashboard}>Back to feature flags</Link>
        </Button>
      </main>
    );
  }

  return (
    <main>
      <EditFlagForm key={flag.id} flag={flag} />
    </main>
  );
}
