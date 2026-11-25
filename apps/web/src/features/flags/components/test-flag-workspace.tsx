import type { EvaluationContext, FlagResponse, TestFlagResponse } from "@flagkit/shared/schemas";
import { Check, Dices, FlaskConical, Loader2, Minus, Play, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentProject } from "@/features/projects/project-context";
import { cn } from "@/lib/utils";
import { useTestFlag } from "../hooks";
import { operatorLabels, parseScalar } from "../rules";
import { Card } from "./card";

interface PropertyRow {
  id: string;
  name: string;
  value: string;
}

const randomUserId = () => `user_${Math.random().toString(36).slice(2, 8)}`;

const show = (value: unknown) => (Array.isArray(value) ? value.join(", ") : String(value));

const statusStyle: Record<
  TestFlagResponse["trace"]["rules"][number]["status"],
  { label: string; className: string }
> = {
  passed: {
    label: "Passed",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  missed_rollout: {
    label: "Missed the rollout",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  conditions_not_matched: {
    label: "Conditions didn't match",
    className: "text-muted-foreground",
  },
  turned_off: { label: "Turned off", className: "text-muted-foreground" },
  not_reached: { label: "Not reached", className: "text-muted-foreground/70" },
};

const reasonText: Record<TestFlagResponse["trace"]["reason"], string> = {
  passed: "The user passed a set.",
  flag_disabled: "The flag is switched off, so it is off for everyone.",
  no_rule_passed: "The user passed none of the sets, so the flag is off for them.",
  no_variant:
    "The user passed a set, but no variant could be chosen. The forced variant may be gone, or the variant percentages leave a gap.",
};

/** Two cards for the test page: who to test as, and what that user gets. */
export function TestFlagWorkspace({ flag }: { flag: FlagResponse }) {
  const { project } = useCurrentProject();
  const test = useTestFlag(project.id, flag.id);
  const [userId, setUserId] = useState(randomUserId);
  const [properties, setProperties] = useState<PropertyRow[]>([]);

  const run = (e: React.FormEvent) => {
    e.preventDefault();
    const context: EvaluationContext = {
      userId: userId.trim() || randomUserId(),
      properties: Object.fromEntries(
        properties
          .filter((row) => row.name.trim())
          .map((row) => [row.name.trim(), parseScalar(row.value)]),
      ),
    };
    test.mutate(context);
  };

  const updateRow = (id: string, patch: Partial<PropertyRow>) =>
    setProperties((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  return (
    <>
      <Card title="Test as this user" hint="Pretend to be a user and see what they would get">
        <form onSubmit={run} noValidate className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="test-user-id" className="text-sm font-semibold">
              User ID
            </Label>
            <div className="flex gap-2">
              <Input
                id="test-user-id"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="h-9 font-mono"
              />
              <Button type="button" variant="outline" onClick={() => setUserId(randomUserId())}>
                <Dices /> Random
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The same user ID always lands in the same place, so try a few different ones.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">User properties</Label>
            {properties.map((row, i) => (
              <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input
                  value={row.name}
                  onChange={(e) => updateRow(row.id, { name: e.target.value })}
                  placeholder="country"
                  aria-label={`Property ${i + 1} name`}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-9"
                />
                <Input
                  value={row.value}
                  onChange={(e) => updateRow(row.id, { value: e.target.value })}
                  placeholder="IN"
                  aria-label={`Property ${i + 1} value`}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  onClick={() => setProperties((rows) => rows.filter((r) => r.id !== row.id))}
                  aria-label={`Remove property ${i + 1}`}
                >
                  <X />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setProperties((rows) => [...rows, { id: crypto.randomUUID(), name: "", value: "" }])
              }
            >
              <Plus /> Add property
            </Button>
            <p className="text-xs text-muted-foreground">
              Typed like rule values: 25 is a number, true is a boolean, "25" is text.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={test.isPending}>
            {test.isPending ? <Loader2 className="animate-spin" /> : <Play />}
            Evaluate
          </Button>
        </form>
      </Card>

      <Card title="Result">
        {test.isError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {test.error.message}
          </p>
        )}

        {test.data ? (
          <TestResult data={test.data} multivariate={flag.type === "multivariate"} />
        ) : (
          !test.isError && (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <FlaskConical className="size-8" />
              <p className="text-sm">Run a test to see what this user gets and why.</p>
            </div>
          )
        )}
      </Card>
    </>
  );
}

function TestResult({ data, multivariate }: { data: TestFlagResponse; multivariate: boolean }) {
  const { result, trace } = data;
  const passedIndex = trace.rules.findIndex((rule) => rule.status === "passed");

  return (
    <div className="space-y-5" aria-live="polite">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "rounded-md px-3 py-1 text-sm font-semibold",
            result.enabled
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          {result.enabled ? "ON" : "OFF"}
        </span>
        {multivariate && result.variant && (
          <span className="text-sm">
            Variant <strong className="font-mono">{result.variant}</strong>
            {trace.variantSource === "forced" && ` (forced by Set ${passedIndex + 1})`}
            {trace.variantSource === "split" &&
              ` (picked by the variants' percentages, variant bucket ${trace.variantBucket})`}
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{reasonText[trace.reason]}</p>

      {result.payload != null && (
        <div>
          <p className="mb-1 text-sm font-semibold">Payload</p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">
            {JSON.stringify(result.payload, null, 2)}
          </pre>
        </div>
      )}

      <p className="text-sm">
        Rollout bucket <strong>{trace.bucket}</strong>
        <span className="text-muted-foreground">
          {" "}
          (a set lets the user in when this is below its rollout percentage)
        </span>
      </p>

      <ol className="space-y-2">
        {trace.rules.map((rule, i) => {
          const style = statusStyle[rule.status];
          return (
            <li key={i} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
                  Set {i + 1}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    style.className,
                  )}
                >
                  {style.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  rollout {rule.rolloutPercentage}%
                  {rule.status === "missed_rollout" &&
                    `, bucket ${trace.bucket} is not below ${rule.rolloutPercentage}`}
                  {rule.status === "passed" &&
                    `, bucket ${trace.bucket} is below ${rule.rolloutPercentage}`}
                </span>
              </div>

              {rule.conditions.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  No conditions: matches everyone.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {rule.conditions.map((condition, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs">
                      {condition.matched ? (
                        <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span>
                        <span className="font-mono">{condition.attribute}</span>{" "}
                        {operatorLabels[condition.operator]}{" "}
                        <span className="font-mono">{show(condition.value)}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          &mdash;{" "}
                          {condition.actual === null
                            ? "the user sent nothing"
                            : `the user sent ${show(condition.actual)}`}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
