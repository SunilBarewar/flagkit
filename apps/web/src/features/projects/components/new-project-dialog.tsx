import { CreateProjectBody } from "@flagkit/shared/schemas";
import { Check, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { paths } from "@/routes/paths";
import { useCreateProject } from "../hooks";
import { useCurrentProject } from "../project-context";

/**
 * Asks for a name, creates the project, then shows its API key. The key is returned only once and
 * Flagkit keeps just a hash, so the dialog can't be dismissed by accident until "Done".
 * Mount it to open it, and unmount it (`onClose`) to close it.
 */
export function NewProjectDialog({ onClose }: { onClose: () => void }) {
  const { select } = useCurrentProject();
  const navigate = useNavigate();
  const create = useCreateProject();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const created = create.data;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = CreateProjectBody.safeParse({ name });
    if (!parsed.success) {
      setError(name.trim() ? "Keep the name under 100 characters" : "Enter a project name");
      return;
    }
    setError(undefined);
    create.mutate(parsed.data);
  };

  const finish = () => {
    if (created) {
      select(created.project.id);
      navigate(paths.dashboard);
    }
    onClose();
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the key is selectable in the field.
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !created && onClose()}>
      <DialogContent
        showClose={!created}
        onInteractOutside={(e) => created && e.preventDefault()}
        onEscapeKeyDown={(e) => created && e.preventDefault()}
      >
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Project created</DialogTitle>
              <DialogDescription>
                Copy the API key for <strong>{created.project.name}</strong> now. It is shown only
                once and can't be recovered later.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2">
              <Input
                readOnly
                value={created.apiKey}
                aria-label="API key"
                onFocus={(e) => e.currentTarget.select()}
                className="h-9 font-mono text-xs"
              />
              <Button type="button" variant="outline" onClick={copy}>
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" onClick={finish}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} noValidate className="grid gap-4">
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
              <DialogDescription>
                A project holds your feature flags and has its own API key.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="project-name" className="text-sm">
                Project name
              </Label>
              <Input
                id="project-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E-commerce"
                autoComplete="off"
                aria-invalid={!!error}
                className="h-9"
              />
              {(error ?? create.error) && (
                <p role="alert" className="text-sm text-destructive">
                  {error ?? create.error?.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="animate-spin" />}
                Create project
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
