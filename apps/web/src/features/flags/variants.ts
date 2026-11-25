import type { VariantInput, VariantResponse } from "@flagkit/shared/schemas";

/** A variant as edited in the form. Nothing is saved until the flag is. */
export interface VariantDraft {
  id: string;
  key: string;
  rolloutPercentage: number;
  description: string;
  /** JSON text, so it can be edited freely before it is parsed on save. */
  payload: string;
}

export const newVariant = (patch: Partial<VariantDraft> = {}): VariantDraft => ({
  id: crypto.randomUUID(),
  key: "",
  rolloutPercentage: 0,
  description: "",
  payload: "",
  ...patch,
});

export const toVariantDrafts = (variants: VariantResponse[]): VariantDraft[] =>
  variants.map((variant) =>
    newVariant({
      id: variant.id,
      key: variant.key,
      rolloutPercentage: variant.rolloutPercentage,
      description: variant.description ?? "",
      payload: variant.payload === null ? "" : JSON.stringify(variant.payload, null, 2),
    }),
  );

export const initialVariants = () => [
  newVariant({ key: "variant-a", rolloutPercentage: 50 }),
  newVariant({ key: "variant-b", rolloutPercentage: 50 }),
];

export const variantLetter = (index: number) => String.fromCharCode(65 + index);

/** Split 100 as evenly as possible; the first variants take the remainder. */
export function balance(variants: VariantDraft[]): VariantDraft[] {
  const share = Math.floor(100 / variants.length);
  const remainder = 100 - share * variants.length;
  return variants.map((variant, i) => ({
    ...variant,
    rolloutPercentage: share + (i < remainder ? 1 : 0),
  }));
}

/** The drafts as the API expects them, or the first problem found. */
export function toVariantInputs(
  drafts: VariantDraft[],
): { variants: VariantInput[] } | { error: string } {
  const variants: VariantInput[] = [];
  for (const [i, draft] of drafts.entries()) {
    let payload: VariantInput["payload"];
    if (draft.payload.trim()) {
      try {
        payload = JSON.parse(draft.payload);
      } catch {
        return { error: `Variant ${variantLetter(i)}: the payload isn't valid JSON` };
      }
    }
    variants.push({
      key: draft.key.trim(),
      description: draft.description.trim() || undefined,
      payload,
      rolloutPercentage: draft.rolloutPercentage,
    });
  }
  return { variants };
}
