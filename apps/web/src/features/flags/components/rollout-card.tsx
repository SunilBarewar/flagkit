import { Input } from "@/components/ui/input";
import { Card } from "./card";

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value) || 0));

interface RolloutCardProps {
  rollout: number;
  onRolloutChange: (rollout: number) => void;
  enabled: boolean;
}

export function RolloutCard({ rollout, onRolloutChange, enabled }: RolloutCardProps) {
  return (
    <Card title="Release conditions">
      <p className="text-muted-foreground">
        Choose how many users get this flag once it's enabled. Targeting by user properties is
        coming soon.
      </p>
      <div className="mt-5 flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={100}
          value={rollout}
          onChange={(e) => onRolloutChange(clampPercent(e.target.valueAsNumber))}
          aria-label="Rollout percentage"
          className="h-2 flex-1 cursor-pointer accent-primary"
        />
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={100}
            value={rollout}
            onChange={(e) => onRolloutChange(clampPercent(e.target.valueAsNumber))}
            aria-label="Rollout percentage"
            className="h-9 w-20 text-right"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {enabled
          ? `Rolled out to ${rollout}% of users.`
          : "The flag is disabled, so no one gets it until you enable it."}
      </p>
    </Card>
  );
}
