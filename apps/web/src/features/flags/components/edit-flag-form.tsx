import { zodResolver } from "@hookform/resolvers/zod";
import { CreateFlagFields, ReplaceVariantsBody } from "@flagkit/shared/schemas";
import type { FlagResponse } from "@flagkit/shared/schemas";
import { Check, ChevronRight, Loader2, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentProject, useProjectPaths } from "@/features/projects/project-context";
import { useSaveFlag } from "../hooks";
import { newRule, toRuleDrafts, toRuleInputs } from "../rules";
import { toVariantDrafts, toVariantInputs } from "../variants";
import { Card } from "./card";
import { ReleaseConditions } from "./release-conditions";
import { VariantsEditor } from "./variants-editor";

const FormSchema = CreateFlagFields.pick({ description: true });

interface FormValues {
  description?: string;
}

const FORM_ID = "edit-flag-form";

export function EditFlagForm({ flag }: { flag: FlagResponse }) {
  const links = useProjectPaths();
  const { project } = useCurrentProject();
  const save = useSaveFlag(project.id);
  const [enabled, setEnabled] = useState(flag.enabled);
  const [rules, setRules] = useState(() =>
    flag.rules?.length ? toRuleDrafts(flag.rules) : [newRule()],
  );
  const [rulesError, setRulesError] = useState<string>();
  const [variants, setVariants] = useState(() => toVariantDrafts(flag.variants ?? []));
  const [variantsError, setVariantsError] = useState<string>();
  const [justSaved, setJustSaved] = useState(false);

  // What is saved, to tell whether anything has changed. The description lives in the form itself.
  const currentState = () => JSON.stringify({ rules, variants, enabled });
  const [savedState, setSavedState] = useState(currentState);

  // Confirm the save for a few seconds. The page stays put so you can carry on, or go and test.
  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [justSaved]);
  const multivariate = flag.type === "multivariate";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { description: flag.description ?? "" },
  });

  const hasChanges = isDirty || currentState() !== savedState;

  const onSubmit = handleSubmit((values) => {
    const body = {
      description: values.description?.trim() || null,
      enabled,
    };

    let variantInputs;
    let nextVariantsError: string | undefined;
    if (multivariate) {
      const inputs = toVariantInputs(variants);
      if ("error" in inputs) {
        nextVariantsError = inputs.error;
      } else {
        const parsed = ReplaceVariantsBody.safeParse({ variants: inputs.variants });
        if (parsed.success) variantInputs = inputs.variants;
        else nextVariantsError = parsed.error.issues[0]?.message;
      }
    }

    const ruleInputs = toRuleInputs(rules, {
      multivariate,
      variantKeys: variantInputs?.map((variant) => variant.key) ?? [],
    });
    const nextRulesError = "error" in ruleInputs ? ruleInputs.error : undefined;

    setVariantsError(nextVariantsError);
    setRulesError(nextRulesError);
    if (nextVariantsError || "error" in ruleInputs) return;

    const submittedState = currentState();

    save.mutate(
      { flagId: flag.id, body, variants: variantInputs, rules: ruleInputs.rules },
      {
        onSuccess: () => {
          // What was just saved is the new starting point, so Save is disabled again.
          setSavedState(submittedState);
          reset({ description: values.description ?? "" });
          setJustSaved(true);
        },
      },
    );
  });

  return (
    <>
      <div className="sticky top-14 z-30 border-b bg-background">
        <div className="flex h-14 items-center justify-between gap-4 px-4">
          <nav className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <Link to={links.flags} className="hover:text-foreground">
              Feature flags
            </Link>
            <ChevronRight className="size-4 shrink-0" />
            <span className="truncate font-medium text-foreground">{flag.key}</span>
            <Badge variant="secondary" className="capitalize">
              {flag.type}
            </Badge>
          </nav>
          <div className="flex items-center gap-2">
            {justSaved && (
              <span
                role="status"
                className="flex items-center gap-1 pr-1 text-sm font-medium text-emerald-600 dark:text-emerald-400"
              >
                <Check className="size-4" /> Saved
              </span>
            )}
            <Button asChild variant="ghost">
              <Link to={links.flagTest(flag.id)}>
                <Play /> Test
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={links.flags}>Back</Link>
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              disabled={save.isPending || !hasChanges}
              title={hasChanges ? undefined : "No changes to save"}
            >
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
              <div className="flex items-center gap-1.5">
                <Label htmlFor="enabled" className="text-sm">
                  Enabled
                </Label>
                <InfoTip>Turn the flag on for the users it's rolled out to</InfoTip>
              </div>
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

          <ReleaseConditions
            rules={rules}
            onChange={setRules}
            variantKeys={multivariate ? variants.map((v) => v.key.trim()).filter(Boolean) : []}
            error={rulesError}
          />
        </div>
      </form>
    </>
  );
}
