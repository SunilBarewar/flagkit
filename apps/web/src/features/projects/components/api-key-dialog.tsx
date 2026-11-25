import { Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";
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
import { useRotateApiKey } from "../hooks";
import { useCurrentProject } from "../project-context";
import { ApiKeyField } from "./api-key-field";

/**
 * Shows the current key masked (only its public id is stored) and lets the user replace it.
 * Rotating makes the old key stop working at once, so it asks first, then shows the new key
 * once and can't be dismissed by accident until "Done".
 * Mount it to open it, and unmount it (`onClose`) to close it.
 */
export function ApiKeyDialog({ onClose }: { onClose: () => void }) {
  const { project } = useCurrentProject();
  const rotate = useRotateApiKey();
  const [confirming, setConfirming] = useState(false);
  const rotated = rotate.data;

  return (
    <Dialog open onOpenChange={(open) => !open && !rotated && onClose()}>
      <DialogContent
        showClose={!rotated}
        onInteractOutside={(e) => rotated && e.preventDefault()}
        onEscapeKeyDown={(e) => rotated && e.preventDefault()}
      >
        {rotated ? (
          <>
            <DialogHeader>
              <DialogTitle>Your new API key</DialogTitle>
              <DialogDescription>
                Copy your new key for <strong>{rotated.project.name}</strong> and save it somewhere
                safe. You won't be able to see it again. The old key has stopped working.
              </DialogDescription>
            </DialogHeader>
            <ApiKeyField value={rotated.apiKey} />
            <DialogFooter>
              <Button type="button" onClick={onClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>API key</DialogTitle>
              <DialogDescription>
                The key for <strong>{project.name}</strong>. For safety, it's only shown once, right when it's made. If you lost it, or it's leaked, create a new one.
              </DialogDescription>
            </DialogHeader>
            <Input
              readOnly
              value={`fk_${project.apiKeyId}_${"•".repeat(32)}`}
              aria-label="Current API key"
              className="h-9 font-mono text-xs"
            />
            {confirming && (
              <p className="flex items-start gap-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                The current key will stop working right away. Your apps will need the new key to
                keep working.
              </p>
            )}
            {rotate.error && (
              <p role="alert" className="text-sm text-destructive">
                {rotate.error.message}
              </p>
            )}
            <DialogFooter className="gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {confirming ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={rotate.isPending}
                  onClick={() => rotate.mutate(project.id)}
                >
                  {rotate.isPending && <Loader2 className="animate-spin" />}
                  Yes, make a new key
                </Button>
              ) : (
                <Button type="button" onClick={() => setConfirming(true)}>
                  Make a new key
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
