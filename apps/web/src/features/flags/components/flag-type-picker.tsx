import { Check, Flag, ListTree } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FlagType } from "@flagkit/shared/schemas";
import { cn } from "@/lib/utils";

interface FlagTypeOption {
  id: FlagType | "remote-config";
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
    available: true,
  }
];

interface FlagTypePickerProps {
  value: FlagType;
  onChange: (type: FlagType) => void;
}

export function FlagTypePicker({ value, onChange }: FlagTypePickerProps) {
  return (
    <div>
      <div role="radiogroup" aria-label="Flag type" className="grid gap-3 sm:grid-cols-3">
        {options.map(({ id, title, description, icon: Icon, available }) => {
          const selected = id === value;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!available}
              onClick={() => id !== "remote-config" && onChange(id)}
              className={cn(
                "rounded-lg border px-4 py-3 text-left",
                selected && "border-primary ring-1 ring-primary",
                !available && "cursor-not-allowed",
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={cn("size-4", !available && "text-muted-foreground")} />
                <span className={cn("font-medium", !available && "text-muted-foreground")}>
                  {title}
                </span>
                {selected && <Check className="ml-auto size-4 text-primary" />}
                {!available && (
                  <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
                )}
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {value === "boolean" ? (
          <>
            Returns <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">true</code>{" "}
            or <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">false</code> based
            on whether the flag is enabled and the rollout below.
          </>
        ) : (
          "Returns one of the variants below, chosen by each variant's rollout percentage."
        )}
      </p>
    </div>
  );
}
