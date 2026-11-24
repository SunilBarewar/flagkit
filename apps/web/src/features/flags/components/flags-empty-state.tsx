import { Flag, Plus } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { paths } from "@/routes/paths";

export function FlagsEmptyState() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-20 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-foreground">
        <Flag className="size-6" />
      </div>
      <h2 className="mt-5 text-xl font-semibold">Create your first feature flag</h2>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Flags let you turn features on and off and roll them out gradually, without a deploy.
      </p>
      <Button asChild size="lg" className="mt-6 h-10">
        <Link to={paths.newFlag}>
          <Plus /> Create feature flag
        </Link>
      </Button>
    </div>
  );
}
