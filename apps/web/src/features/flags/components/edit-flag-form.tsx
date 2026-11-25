import { zodResolver } from "@hookform/resolvers/zod";
import { CreateFlagFields, ReplaceVariantsBody } from "@flagkit/shared/schemas";
import type { FlagResponse } from "@flagkit/shared/schemas";
import { ChevronRight, Info, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentProject } from "@/features/projects/project-context";
import { paths } from "@/routes/paths";
import { useSaveFlag } from "../hooks";
import { toVariantDrafts, toVariantInputs } from "../variants";
import { Card } from "./card";
import { RolloutCard } from "./rollout-card";
import { VariantsEditor } from "./variants-editor";

const FormSchema = CreateFlagFields.pick({ description: true });

interface FormValues {
  description?: string;
}

const FORM_ID = "edit-flag-form";

export function EditFlagForm({ flag }: { flag: FlagResponse }) {
  const { project } = useCurrentProject();
  const navigate = useNavigate();
  const save = useSaveFlag(project.id);
  const [enabled, setEnabled] = useState(flag.enabled);
  // The rollout card edits one rule that matches everyone. Flags with other rules keep them.
  const rules = flag.rules ?? [];
  const defaultRule = rules.length === 1 ? rules[0] : undefined;
  const hasDefaultRuleOnly =
    !!defaultRule && defaultRule.conditions.length === 0 && !defaultRule.variantKey;
  const [rollout, setRollout] = useState(defaultRule?.rolloutPercentage ?? 0);
  const [variants, setVariants] = useState(() => toVariantDrafts(flag.variants ?? []));
  const [variantsError, setVariantsError] = useState<string>();
  const multivariate = flag.type === "multivariate";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { description: flag.description ?? "" },
  });

  const onSubmit = handleSubmit((values) => {
    const body = {
      description: values.description?.trim() || null,
      enabled,
    };

    let variantInputs;
    if (multivariate) {
      const inputs = toVariantInputs(variants);
      if ("error" in inputs) {
        setVariantsError(inputs.error);
        return;
      }
      const parsed = ReplaceVariantsBody.safeParse({ variants: inputs.variants });
      if (!parsed.success) {
        setVariantsError(parsed.error.issues[0]?.message);
        return;
      }
      variantInputs = inputs.variants;
    }
    setVariantsError(undefined);

    save.mutate(
      {
        flagId: flag.id,
        body,
        variants: variantInputs,
        rules: hasDefaultRuleOnly
          ? [{ enabled: defaultRule.enabled, rolloutPercentage: rollout, conditions: [] }]
          : undefined,
      },
      { onSuccess: () => navigate(paths.dashboard) },
    );
  });

  return (
    <>
      <div className="sticky top-14 z-30 border-b bg-background">
        <div className="flex h-14 items-center justify-between gap-4 px-4">
          <nav className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <Link to={paths.dashboard} className="hover:text-foreground">
              Feature flags
            </Link>
            <ChevronRight className="size-4 shrink-0" />
            <span className="truncate font-medium text-foreground">{flag.key}</span>
            <Badge variant="secondary" className="capitalize">
              {flag.type}
            </Badge>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to={paths.dashboard}>Cancel</Link>
            </Button>
            <Button type="submit" form={FORM_ID} disabled={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </div>

      <form
        id={FORM_ID}
        onSubmit={onSubmit}
        noValidate
        className="grid items-start gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
      >
        {save.error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive lg:col-span-2"
          >
            {save.error.message}
          </div>
        )}

        <Card title="Flag key">
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                value={flag.key}
                readOnly
                disabled
                aria-label="Flag key"
                className="h-10 font-mono"
              />
              <p className="text-sm text-muted-foreground">The key can't be changed.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="(Optional) A description of the feature flag for your reference."
                rows={5}
                className="min-h-28 bg-card"
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-destructive">Keep it under 500 characters</p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <Label htmlFor="enabled" className="text-sm">
                Enabled
                <Info className="size-4 text-muted-foreground">
                  <title>Turn the flag on for the users it's rolled out to</title>
                </Info>
              </Label>
              <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {multivariate && (
            <Card title="Variants" hint="The values the flag can return">
              <VariantsEditor variants={variants} onChange={setVariants} />
              {variantsError && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {variantsError}
                </p>
              )}
            </Card>
          )}

          {hasDefaultRuleOnly ? (
            <RolloutCard rollout={rollout} onRolloutChange={setRollout} enabled={enabled} />
          ) : (
            <Card title="Release conditions">
              <p className="text-muted-foreground">
                This flag has {rules.length} targeting rules. Editing them here is coming soon, and
                saving keeps them as they are.
              </p>
            </Card>
          )}
        </div>
      </form>
    </>
  );
}
