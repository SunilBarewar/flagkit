import { z } from "zod";

import { VariantResponse, VariantSet } from "./variants.ts";

export const FlagType = z.enum(["boolean", "multivariate"]);
export type FlagType = z.infer<typeof FlagType>;

/** What the SDK passes to evaluate a flag. Lowercase, so `new_checkout` and `New_Checkout` can't both exist. */
export const FlagKey = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, underscores and hyphens");

const Description = z.string().trim().max(500);
const RolloutPercentage = z.int().min(0).max(100);

export const CreateFlagFields = z.object({
  key: FlagKey,
  description: Description.optional(),
  enabled: z.boolean().default(false),
});

export const CreateFlagBody = z.discriminatedUnion("type", [
  CreateFlagFields.extend({
    type: z.literal("boolean"),
    rolloutPercentage: RolloutPercentage.default(100),
  }),
  CreateFlagFields.extend({ type: z.literal("multivariate"), variants: VariantSet }),
]);
export type CreateFlagBody = z.infer<typeof CreateFlagBody>;
export type CreateFlagInput = z.input<typeof CreateFlagBody>;

/** The key and type can't be changed: SDKs depend on both. */
export const UpdateFlagBody = z
  .object({
    description: Description.nullable().optional(),
    enabled: z.boolean().optional(),
    rolloutPercentage: RolloutPercentage.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: "Provide at least one of: description, enabled, rolloutPercentage",
  });
export type UpdateFlagBody = z.infer<typeof UpdateFlagBody>;

export const FlagResponse = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  key: z.string(),
  description: z.string().nullable(),
  type: FlagType,
  enabled: z.boolean(),
  rolloutPercentage: z.int(),
  /** Included for multivariate flags when they are created. */
  variants: z.array(VariantResponse).optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type FlagResponse = z.infer<typeof FlagResponse>;

export const ProjectIdParams = z.object({ projectId: z.uuid() });
export type ProjectIdParams = z.infer<typeof ProjectIdParams>;

export const FlagIdParams = ProjectIdParams.extend({ flagId: z.uuid() });
export type FlagIdParams = z.infer<typeof FlagIdParams>;
