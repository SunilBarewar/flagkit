import { Check, Flag, ListTree, SquareCode } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlagTypeOption {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  available: boolean;
}

const options: FlagTypeOption[] = [
  {
    id: "boolean",
    title: "Boolean",
    description: "Release toggle: on or off for each user",
    icon: Flag,
    available: true,
  },
  {
    id: "multivariate",
    title: "Multivariate",
    description: "Multiple variants with rollout percentages (A/B/n test)",
    icon: ListTree,
    available: false,
  },
  {
    id: "remote-config",
    title: "Remote config",
    description: "A single payload without feature flag logic",
    icon: SquareCode,
    available: false,
  },
];

/** Only boolean exists for now, so it's always the selected one. */
export function FlagTypePicker() {
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map(({ id, title, description, icon: Icon, available }) => (
          <div
            key={id}
            aria-disabled={!available}
            className={cn(
              "rounded-lg border px-4 py-3",
              available ? "border-primary ring-1 ring-primary" : "cursor-not-allowed",
            )}
          >
            <div className="flex items-center gap-2.5">
              <Icon className={cn("size-4", !available && "text-muted-foreground")} />
              <span className={cn("font-medium", !available && "text-muted-foreground")}>
                {title}
              </span>
              {available ? (
                <Check className="ml-auto size-4 text-primary" />
              ) : (
                <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Returns <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">true</code> or{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">false</code> based on
        whether the flag is enabled and the rollout below.
      </p>
    </div>
  );
}
