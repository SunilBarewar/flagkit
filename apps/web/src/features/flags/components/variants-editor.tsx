import { MAX_VARIANTS, MIN_VARIANTS } from "@flagkit/shared/schemas";
import {
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  Plus,
  Scale,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { balance, newVariant, variantLetter } from "../variants";
import type { VariantDraft } from "../variants";

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value) || 0));

interface VariantsEditorProps {
  variants: VariantDraft[];
  onChange: (variants: VariantDraft[]) => void;
}

export function VariantsEditor({ variants, onChange }: VariantsEditorProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const total = variants.reduce((sum, variant) => sum + variant.rolloutPercentage, 0);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const update = (id: string, patch: Partial<VariantDraft>) =>
    onChange(variants.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)));

  const add = () => {
    const variant = newVariant({ key: `variant-${variantLetter(variants.length).toLowerCase()}` });
    onChange([...variants, variant]);
    setExpanded((prev) => new Set(prev).add(variant.id));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn("text-sm", total === 100 ? "text-muted-foreground" : "text-destructive")}>
          Percentage rollouts for variants must sum to 100 (currently {total}).
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(new Set(variants.map((v) => v.id)))}
          >
            <ChevronsUpDown /> Expand all
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(new Set())}>
            <ChevronsDownUp /> Collapse all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(balance(variants))}
            aria-label="Split rollout evenly"
            title="Split rollout evenly"
          >
            <Scale />
          </Button>
        </div>
      </div>

      <ul className="divide-y overflow-hidden rounded-lg border">
        {variants.map((variant, index) => {
          const open = expanded.has(variant.id);
          return (
            <li key={variant.id}>
              <button
                type="button"
                onClick={() => toggle(variant.id)}
                aria-expanded={open}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left",
                  open && "bg-muted/50",
                )}
              >
                {open ? (
                  <ChevronUp className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
                <span className="flex size-6 items-center justify-center rounded bg-muted text-xs font-medium">
                  {variantLetter(index)}
                </span>
                <span className="font-medium">{variant.key || "Untitled"}</span>
                <span className="text-sm text-muted-foreground">
                  ({variant.rolloutPercentage}%)
                </span>
              </button>

              {open && (
                <div className="space-y-4 border-t px-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${variant.id}-key`}>Variant key</Label>
                    <Input
                      id={`${variant.id}-key`}
                      value={variant.key}
                      onChange={(e) => update(variant.id, { key: e.target.value })}
                      autoComplete="off"
                      spellCheck={false}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${variant.id}-rollout`}>Rollout percentage</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`${variant.id}-rollout`}
                        type="number"
                        min={0}
                        max={100}
                        value={variant.rolloutPercentage}
                        onChange={(e) =>
                          update(variant.id, {
                            rolloutPercentage: clampPercent(e.target.valueAsNumber),
                          })
                        }
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${variant.id}-description`}>Description</Label>
                    <Textarea
                      id={`${variant.id}-description`}
                      value={variant.description}
                      onChange={(e) => update(variant.id, { description: e.target.value })}
                      placeholder="Enter an optional description for the variant"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${variant.id}-payload`}>Payload</Label>
                    <Textarea
                      id={`${variant.id}-payload`}
                      value={variant.payload}
                      onChange={(e) => update(variant.id, { payload: e.target.value })}
                      placeholder='{"key": "value"}'
                      rows={2}
                      spellCheck={false}
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={variants.length <= MIN_VARIANTS}
                    onClick={() => onChange(variants.filter((v) => v.id !== variant.id))}
                    className="w-full border-destructive/40 text-destructive hover:text-destructive"
                  >
                    <Trash2 /> Remove variant
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={variants.length >= MAX_VARIANTS}
        onClick={add}
      >
        <Plus /> Add variant
      </Button>
    </div>
  );
}
