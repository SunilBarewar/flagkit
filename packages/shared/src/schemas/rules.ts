import { z } from "zod";

import { VariantKey } from "./variants.ts";

const Attribute = z.string().trim().min(1, "Choose a property").max(100);
const Scalar = z.union([z.string(), z.number(), z.boolean()]);

/** The value must suit the operator, e.g. `in` takes a list and `greater_than` a number. */
export const ConditionInput = z.discriminatedUnion("operator", [
  z.object({
    attribute: Attribute,
    operator: z.enum(["equals", "not_equals"]),
    value: Scalar,
  }),
  z.object({
    attribute: Attribute,
    operator: z.enum(["in", "not_in"]),
    value: z.array(Scalar).min(1, "Add at least one value").max(100),
  }),
  z.object({
    attribute: Attribute,
    operator: z.enum(["greater_than", "less_than"]),
    value: z.number(),
  }),
  z.object({
    attribute: Attribute,
    operator: z.literal("contains"),
    value: z.string().min(1, "Enter text to look for"),
  }),
]);
export type ConditionInput = z.infer<typeof ConditionInput>;
export type ConditionOperator = ConditionInput["operator"];

export const MAX_RULES = 20;
export const MAX_CONDITIONS = 20;

export const RuleInput = z.object({
  enabled: z.boolean().default(true),
  /** Share (0-100) of the users matching this rule who pass it. */
  rolloutPercentage: z.int().min(0).max(100),
  /** Multivariate flags only: serve this variant instead of splitting by the variants' percentages. */
  variantKey: VariantKey.optional(),
  /** No conditions means the rule matches every user. */
  conditions: z.array(ConditionInput).max(MAX_CONDITIONS).default([]),
});
export type RuleInput = z.infer<typeof RuleInput>;

/** Every flag has at least one rule. Order is priority: the first rule a user passes wins. */
export const RuleSet = z.array(RuleInput).min(1, "A flag needs at least one rule").max(MAX_RULES);

/** What a new flag gets when it is created without rules: everyone matches, nobody passes. */
export const DEFAULT_RULES: RuleInput[] = [{ enabled: true, rolloutPercentage: 0, conditions: [] }];

export const ReplaceRulesBody = z.object({ rules: RuleSet });
export type ReplaceRulesBody = z.infer<typeof ReplaceRulesBody>;
export type ReplaceRulesInput = z.input<typeof ReplaceRulesBody>;

export const RuleResponse = z.object({
  id: z.uuid(),
  priority: z.int(),
  enabled: z.boolean(),
  rolloutPercentage: z.int(),
  variantKey: z.string().nullable(),
  conditions: z.array(
    z.object({
      id: z.uuid(),
      attribute: z.string(),
      operator: z.enum([
        "equals",
        "not_equals",
        "in",
        "not_in",
        "greater_than",
        "less_than",
        "contains",
      ]),
      value: z.json(),
    }),
  ),
});
export type RuleResponse = z.infer<typeof RuleResponse>;
