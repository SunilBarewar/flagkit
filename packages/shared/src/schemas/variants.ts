import { z } from "zod";

export const MIN_VARIANTS = 2;
export const MAX_VARIANTS = 20;

export const VariantInput = z.object({
  key: z
    .string()
    .min(1, "Give every variant a key")
    .max(100)
    .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, underscores and hyphens"),
  description: z.string().trim().max(500).optional(),
  payload: z.json().optional(),
  rolloutPercentage: z.int().min(0).max(100),
});
export type VariantInput = z.infer<typeof VariantInput>;

/** A flag's whole set of variants. It is always saved together, so the total can be checked. */
export const VariantSet = z
  .array(VariantInput)
  .min(MIN_VARIANTS, `Add at least ${MIN_VARIANTS} variants`)
  .max(MAX_VARIANTS)
  .refine((variants) => new Set(variants.map((v) => v.key)).size === variants.length, {
    message: "Variant keys must be unique",
  })
  .refine((variants) => variants.reduce((sum, v) => sum + v.rolloutPercentage, 0) === 100, {
    message: "Variant rollout percentages must add up to 100",
  });

export const ReplaceVariantsBody = z.object({ variants: VariantSet });
export type ReplaceVariantsBody = z.infer<typeof ReplaceVariantsBody>;

export const VariantResponse = z.object({
  id: z.uuid(),
  flagId: z.uuid(),
  key: z.string(),
  description: z.string().nullable(),
  payload: z.json().nullable(),
  rolloutPercentage: z.int(),
  createdAt: z.iso.datetime(),
});
export type VariantResponse = z.infer<typeof VariantResponse>;
