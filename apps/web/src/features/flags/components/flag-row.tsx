import type { FlagResponse } from "@flagkit/shared/schemas";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface FlagRowProps {
  flag: FlagResponse;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export function FlagRow({ flag, onToggle, disabled }: FlagRowProps) {
  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-mono text-sm font-medium">{flag.key}</p>
          <Badge variant="secondary" className="capitalize">
            {flag.type}
          </Badge>
        </div>
        {flag.description && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{flag.description}</p>
        )}
      </div>

      <div className="hidden w-32 shrink-0 sm:block">
        <p className="text-xs text-muted-foreground">Rollout {flag.rolloutPercentage}%</p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${flag.rolloutPercentage}%` }}
          />
        </div>
      </div>

      <Switch
        checked={flag.enabled}
        onCheckedChange={onToggle}
        disabled={disabled}
        aria-label={`${flag.enabled ? "Disable" : "Enable"} ${flag.key}`}
      />
    </li>
  );
}
