import { MAX_CONDITIONS, MAX_RULES } from "@flagkit/shared/schemas";
import type { ConditionOperator } from "@flagkit/shared/schemas";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { describeAudience, newCondition, newRule, operatorLabels } from "../rules";
import type { ConditionDraft, RuleDraft } from "../rules";
import { Card } from "./card";

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value) || 0));

const PRESETS = [0, 10, 25, 50, 75, 100];

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const CONDITION_GRID = "grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_9.5rem_1fr_2rem]";

const valuePlaceholder: Record<ConditionOperator, string> = {
  equals: "IN",
  not_equals: "IN",
  in: "IN, US, UK",
  not_in: "IN, US, UK",
  greater_than: "18",
  less_than: "60",
  contains: "gmail.com",
};

const chipClass = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium";

interface ReleaseConditionsProps {
  rules: RuleDraft[];
  onChange: (rules: RuleDraft[]) => void;
  /** Multivariate flags: the variants a rule can serve. Empty for boolean flags. */
  variantKeys?: string[];
  error?: string;
}

export function ReleaseConditions({
  rules,
  onChange,
  variantKeys = [],
  error,
}: ReleaseConditionsProps) {
  const [editing, setEditing] = useState<Set<string>>(() => new Set());

  const toggle = (id: string) =>
    setEditing((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const update = (id: string, patch: Partial<RuleDraft>) =>
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));

  const move = (index: number, by: -1 | 1) => {
    const next = [...rules];
    const [rule] = next.splice(index, 1);
    next.splice(index + by, 0, rule!);
    onChange(next);
  };

  const add = () => {
    const rule = newRule();
    onChange([...rules, rule]);
    setEditing((prev) => new Set(prev).add(rule.id));
  };

  return (
    <Card title="Release conditions">
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
        Sets are checked top to bottom. A user gets the flag from the first set they match and fall
        inside the rollout of. If they miss a set's rollout, they move on to the next one. Users who
        pass no set don't get the flag.
      </p>

      <ul className="space-y-3">
        {rules.map((rule, index) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            index={index}
            isOnly={rules.length === 1}
            isFirst={index === 0}
            isLast={index === rules.length - 1}
            editing={editing.has(rule.id)}
            variantKeys={variantKeys}
            onToggle={() => toggle(rule.id)}
            onChange={(patch) => update(rule.id, patch)}
            onMove={(by) => move(index, by)}
            onRemove={() => onChange(rules.filter((r) => r.id !== rule.id))}
          />
        ))}
      </ul>

      <Button
        type="button"
        variant="outline"
        className="mt-4 w-full border-dashed"
        disabled={rules.length >= MAX_RULES}
        onClick={add}
      >
        <Plus /> Add condition set
      </Button>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </Card>
  );
}

interface RuleCardProps {
  rule: RuleDraft;
  index: number;
  isOnly: boolean;
  isFirst: boolean;
  isLast: boolean;
  editing: boolean;
  variantKeys: string[];
  onToggle: () => void;
  onChange: (patch: Partial<RuleDraft>) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}

function RuleCard({
  rule,
  index,
  isOnly,
  isFirst,
  isLast,
  editing,
  variantKeys,
  onToggle,
  onChange,
  onMove,
  onRemove,
}: RuleCardProps) {
  const reachesNobody = !rule.enabled || rule.rolloutPercentage === 0;

  return (
    <li
      className={cn(
        "rounded-xl border bg-card p-4 transition-shadow",
        editing && "shadow-sm ring-1 ring-primary/20",
        !rule.enabled && "bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="rounded-md bg-muted px-2.5 py-1 text-sm font-semibold">
          Set {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <p className={cn(!rule.enabled && "text-muted-foreground")}>
            Condition set will match{" "}
            <strong>{reachesNobody ? "no users" : describeAudience(rule)}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                chipClass,
                rule.rolloutPercentage === 0
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : "border-primary/30 bg-primary/5 text-primary",
              )}
            >
              Rolled out to {rule.rolloutPercentage}% of users in this set
            </span>
            {rule.variantKey && (
              <span className={cn(chipClass, "text-muted-foreground")}>
                Serves {rule.variantKey}
              </span>
            )}
            {!rule.enabled && (
              <span className={cn(chipClass, "text-muted-foreground")}>Turned off</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!isFirst && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onMove(-1)}
              aria-label={`Move set ${index + 1} up`}
            >
              <ArrowUp />
            </Button>
          )}
          {!isLast && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onMove(1)}
              aria-label={`Move set ${index + 1} down`}
            >
              <ArrowDown />
            </Button>
          )}
          <Button
            type="button"
            variant={editing ? "default" : "outline"}
            size="icon"
            onClick={onToggle}
            aria-label={editing ? `Done editing set ${index + 1}` : `Edit set ${index + 1}`}
          >
            {editing ? <Check /> : <Pencil />}
          </Button>
        </div>
      </div>

      {editing && (
        <div className="mt-4 space-y-6 border-t pt-5">
          <ConditionsEditor rule={rule} setIndex={index} onChange={onChange} />
          <RolloutEditor rule={rule} setIndex={index} onChange={onChange} />

          {variantKeys.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor={`${rule.id}-variant`} className="text-sm font-semibold">
                  Optional override
                </Label>
                <InfoTip>
                  Without an override, users in this set are split between the variants by their
                  rollout percentages
                </InfoTip>
              </div>
              <span className="text-sm text-muted-foreground">
                Set variant for all users in this set to
              </span>
              <select
                id={`${rule.id}-variant`}
                value={rule.variantKey}
                onChange={(e) => onChange({ variantKey: e.target.value })}
                className={cn(selectClass, "h-9 w-auto min-w-40")}
              >
                <option value="">Select variant</option>
                {variantKeys.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
              {rule.variantKey && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ variantKey: "" })}
                >
                  Clear
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="flex items-center gap-3">
              <Switch
                id={`${rule.id}-enabled`}
                checked={rule.enabled}
                onCheckedChange={(enabled) => onChange({ enabled })}
              />
              <Label htmlFor={`${rule.id}-enabled`} className="text-sm">
                {rule.enabled ? "Set is on" : "Set is turned off"}
              </Label>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isOnly}
              onClick={onRemove}
              title={isOnly ? "A flag needs at least one condition set" : undefined}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 /> Remove set
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

interface EditorProps {
  rule: RuleDraft;
  setIndex: number;
  onChange: (patch: Partial<RuleDraft>) => void;
}

function ConditionsEditor({ rule, setIndex, onChange }: EditorProps) {
  const update = (id: string, patch: Partial<ConditionDraft>) =>
    onChange({ conditions: rule.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Match users where</h3>

      {rule.conditions.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
          No conditions, so this set matches all users.
        </p>
      ) : (
        <div className="space-y-2">
          <div
            className={cn(
              CONDITION_GRID,
              "hidden text-xs font-medium text-muted-foreground sm:grid",
            )}
          >
            <span>Property</span>
            <span>Operator</span>
            <span>Value</span>
            <span />
          </div>

          {rule.conditions.map((condition, i) => (
            <div key={condition.id} className="space-y-2">
              {i > 0 && (
                <p className="text-xs font-semibold tracking-wide text-muted-foreground">AND</p>
              )}
              <div className={CONDITION_GRID}>
                <Input
                  value={condition.attribute}
                  onChange={(e) => update(condition.id, { attribute: e.target.value })}
                  placeholder="country"
                  aria-label={`Set ${setIndex + 1} condition ${i + 1} property`}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-9"
                />
                <select
                  value={condition.operator}
                  onChange={(e) =>
                    update(condition.id, { operator: e.target.value as ConditionOperator })
                  }
                  aria-label={`Set ${setIndex + 1} condition ${i + 1} operator`}
                  className={cn(selectClass, "h-9")}
                >
                  {Object.entries(operatorLabels).map(([operator, label]) => (
                    <option key={operator} value={operator}>
                      {label}
                    </option>
                  ))}
                </select>
                <Input
                  value={condition.value}
                  onChange={(e) => update(condition.id, { value: e.target.value })}
                  placeholder={valuePlaceholder[condition.operator]}
                  aria-label={`Set ${setIndex + 1} condition ${i + 1} value`}
                  autoComplete="off"
                  spellCheck={false}
                  className="col-span-2 h-9 sm:col-span-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 sm:size-8 sm:self-center"
                  onClick={() =>
                    onChange({ conditions: rule.conditions.filter((c) => c.id !== condition.id) })
                  }
                  aria-label={`Remove condition ${i + 1} from set ${setIndex + 1}`}
                >
                  <X />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={rule.conditions.length >= MAX_CONDITIONS}
        onClick={() => onChange({ conditions: [...rule.conditions, newCondition()] })}
      >
        <Plus /> Add condition
      </Button>

      {rule.conditions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Every condition must match. Numbers and true/false are compared as such. Put text in
          quotes to keep it as text, for example "25", and separate a list with commas.
        </p>
      )}
    </section>
  );
}

function RolloutEditor({ rule, setIndex, onChange }: EditorProps) {
  const set = (value: number) => onChange({ rolloutPercentage: clampPercent(value) });

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Rollout percentage</h3>

      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-sm">
          <input
            type="range"
            min={0}
            max={100}
            value={rule.rolloutPercentage}
            onChange={(e) => set(e.target.valueAsNumber)}
            aria-label={`Set ${setIndex + 1} rollout percentage`}
            className="h-2 w-full cursor-pointer accent-primary"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => set(preset)}
                aria-pressed={rule.rolloutPercentage === preset}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  rule.rolloutPercentage === preset
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-24 shrink-0 self-start">
          <Input
            type="number"
            min={0}
            max={100}
            value={rule.rolloutPercentage}
            onChange={(e) => set(e.target.valueAsNumber)}
            aria-label={`Set ${setIndex + 1} rollout percentage value`}
            className="h-10 pr-7 text-right"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
            %
          </span>
        </div>
      </div>

      <p
        className={cn(
          "text-sm",
          rule.rolloutPercentage === 0 ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {rule.rolloutPercentage === 0
          ? "At 0%, nobody passes this set."
          : `${rule.rolloutPercentage}% of the users who match the conditions get the flag.`}
      </p>
    </section>
  );
}
