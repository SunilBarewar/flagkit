import { zodResolver } from "@hookform/resolvers/zod";
import { CreateFlagBody, CreateFlagFields } from "@flagkit/shared/schemas";
import type { CreateFlagInput, FlagType } from "@flagkit/shared/schemas";
import { ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { isApiError } from "@/api";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentProject } from "@/features/projects/project-context";
import { paths } from "@/routes/paths";
import { useCreateFlag } from "../hooks";
import { newRule, toRuleInputs } from "../rules";
import { initialVariants, toVariantInputs } from "../variants";
import { Card } from "./card";
import { FlagTypePicker } from "./flag-type-picker";
import { ReleaseConditions } from "./release-conditions";
import { VariantsEditor } from "./variants-editor";

// Only the fields typed into the form. The switch, variants and rules are plain state below.
const FormSchema = CreateFlagFields.pick({ key: true, description: true });

interface FormValues {
  key: string;
  description?: string;
}

const FORM_ID = "create-flag-form";

export function CreateFlagForm() {
  const { project } = useCurrentProject();
  const navigate = useNavigate();
  const create = useCreateFlag(project.id);
  const [enabled, setEnabled] = useState(true);
  const [rules, setRules] = useState(() => [newRule()]);
  const [rulesError, setRulesError] = useState<string>();
  const [type, setType] = useState<FlagType>("boolean");
  const [variants, setVariants] = useState(initialVariants);
  const [variantsError, setVariantsError] = useState<string>();

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema) });

  const key = useWatch({ control, name: "key" });

  const onSubmit = handleSubmit((values) => {
    const multivariate = type === "multivariate";
    const variantInputs = multivariate ? toVariantInputs(variants) : undefined;
    const variantKeys =
      variantInputs && "variants" in variantInputs ? variantInputs.variants.map((v) => v.key) : [];
    const ruleInputs = toRuleInputs(rules, { multivariate, variantKeys });

    const nextVariantsError =
      variantInputs && "error" in variantInputs ? variantInputs.error : undefined;
    const nextRulesError = "error" in ruleInputs ? ruleInputs.error : undefined;
    setVariantsError(nextVariantsError);
    setRulesError(nextRulesError);
    if (nextVariantsError || nextRulesError) return;
    if ("error" in ruleInputs) return;

    const common = {
      key: values.key,
      description: values.description || undefined,
      enabled,
      rules: ruleInputs.rules,
    };
    let body: CreateFlagInput;

    if (multivariate && variantInputs && "variants" in variantInputs) {
      body = { ...common, type: "multivariate", variants: variantInputs.variants };
      const parsed = CreateFlagBody.safeParse(body);
      if (!parsed.success) {
        setVariantsError(parsed.error.issues[0]?.message);
        return;
      }
    } else {
      body = { ...common, type: "boolean" };
    }

    create.mutate(body, {
      onSuccess: (flag) => navigate(paths.flag(flag.id)),
      onError: (err) => {
        if (isApiError(err) && err.code === "ALREADY_EXISTS") {
          setError("key", { message: "A flag with this key already exists" });
        }
      },
    });
  });

  const showGenericError =
    create.error && !(isApiError(create.error) && create.error.code === "ALREADY_EXISTS");

  return (
    <>
      <div className="sticky top-14 z-30 border-b bg-background">
        <div className="flex h-14 items-center justify-between gap-4 px-4">
          <nav className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <Link to={paths.dashboard} className="hover:text-foreground">
              Feature flags
            </Link>
            <ChevronRight className="size-4 shrink-0" />
            <span className="truncate font-medium text-foreground">{key || "New flag"}</span>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to={paths.dashboard}>Cancel</Link>
            </Button>
            <Button type="submit" form={FORM_ID} disabled={create.isPending}>
              {create.isPending && <Loader2 className="animate-spin" />}
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
        {showGenericError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive lg:col-span-2"
          >
            {create.error.message}
          </div>
        )}

        <Card title="Flag key" hint="What your code uses to check the flag">
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                id="key"
                placeholder="my-feature"
                autoComplete="off"
                spellCheck={false}
                className="h-10 bg-card font-mono"
                aria-label="Flag key"
                aria-invalid={!!errors.key}
                {...register("key")}
              />
              {errors.key ? (
                <p className="text-sm text-destructive">{errors.key.message}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  What your code checks. Lowercase letters, numbers, underscores and hyphens. It
                  can't be changed later.
                </p>
              )}
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
          <Card title="Flag type" hint="How the flag is evaluated">
            <FlagTypePicker value={type} onChange={setType} />
          </Card>

          {type === "multivariate" && (
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
            variantKeys={
              type === "multivariate" ? variants.map((v) => v.key.trim()).filter(Boolean) : []
            }
            error={rulesError}
          />
        </div>
      </form>
    </>
  );
}
