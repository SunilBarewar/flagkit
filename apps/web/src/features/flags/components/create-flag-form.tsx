import { zodResolver } from "@hookform/resolvers/zod";
import { CreateFlagBody } from "@flagkit/shared/schemas";
import { ChevronRight, Info, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { isApiError } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentProject } from "@/features/projects/project-context";
import { paths } from "@/routes/paths";
import { useCreateFlag } from "../hooks";
import { FlagTypePicker } from "./flag-type-picker";

// Only the fields typed into the form. The switch and rollout are plain state below.
const FormSchema = CreateFlagBody.pick({ key: true, description: true });

interface FormValues {
  key: string;
  description?: string;
}

const FORM_ID = "create-flag-form";

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
        {title}
        {hint && (
          <Info className="size-4 text-muted-foreground" aria-label={hint}>
            <title>{hint}</title>
          </Info>
        )}
      </h2>
      {children}
    </section>
  );
}

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value) || 0));

export function CreateFlagForm() {
  const { project } = useCurrentProject();
  const navigate = useNavigate();
  const create = useCreateFlag(project.id);
  const [isActive, setIsActive] = useState(true);
  const [rollout, setRollout] = useState(100);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema) });

  const key = useWatch({ control, name: "key" });

  const onSubmit = handleSubmit((values) => {
    create.mutate(
      {
        key: values.key,
        description: values.description || undefined,
        type: "boolean",
        isActive,
        defaultValue: false,
        rolloutPercentage: rollout,
      },
      {
        onSuccess: () => navigate(paths.dashboard),
        onError: (err) => {
          if (isApiError(err) && err.code === "ALREADY_EXISTS") {
            setError("key", { message: "A flag with this key already exists" });
          }
        },
      },
    );
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
              <Label htmlFor="isActive" className="text-sm">
                Enabled
                <Info className="size-4 text-muted-foreground">
                  <title>Turn the flag on for the users it's rolled out to</title>
                </Info>
              </Label>
              <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Flag type" hint="How the flag is evaluated">
            <FlagTypePicker />
          </Card>

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
                onChange={(e) => setRollout(clampPercent(e.target.valueAsNumber))}
                aria-label="Rollout percentage"
                className="h-2 flex-1 cursor-pointer accent-primary"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={rollout}
                  onChange={(e) => setRollout(clampPercent(e.target.valueAsNumber))}
                  aria-label="Rollout percentage"
                  className="h-9 w-20 text-right"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {isActive
                ? `Rolled out to ${rollout}% of users.`
                : "The flag is disabled, so no one gets it until you enable it."}
            </p>
          </Card>
        </div>
      </form>
    </>
  );
}
