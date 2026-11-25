import { z } from "zod";

import { FlagKey } from "./flags.ts";
import { ConditionOperator } from "./rules.ts";

export const EvaluateFlagParams = z.object({ flagKey: FlagKey });
export type EvaluateFlagParams = z.infer<typeof EvaluateFlagParams>;

/** A user attribute value that targeting rules can compare against. */
export const PropertyValue = z.union([z.string(), z.number(), z.boolean()]);
export type PropertyValue = z.infer<typeof PropertyValue>;

/**
 * Who a flag is being evaluated for. The app passes it with each evaluation, so Flagkit
 * never has to store the app's users.
 *
 *   { userId: "user_123", properties: { country: "IN", plan: "premium" } }
 *
 * `userId` is what rollouts hash to keep a user's result stable. `properties` are the
 * attributes targeting rules will match on.
 */
export const EvaluationContext = z.object({
  userId: z.string().min(1),
  properties: z.record(z.string(), PropertyValue).default({}),
});
export type EvaluationContext = z.infer<typeof EvaluationContext>;

/**
 * Boolean flags return `key` and `enabled`. Multivariate flags also return the chosen `variant`
 * and its `payload`, both null when the flag is off for the user.
 */
export const EvaluateFlagResponse = z.object({
  key: z.string(),
  enabled: z.boolean(),
  variant: z.string().nullable().optional(),
  payload: z.json().nullable().optional(),
});
export type EvaluateFlagResponse = z.infer<typeof EvaluateFlagResponse>;

/** What happened to one rule when a user was evaluated. */
export const RuleStatus = z.enum([
  "passed",
  "turned_off",
  "conditions_not_matched",
  "missed_rollout",
  "not_reached",
]);
export type RuleStatus = z.infer<typeof RuleStatus>;

/** How an evaluation reached its result, for testing a flag. */
export const EvaluationTrace = z.object({
  reason: z.enum(["flag_disabled", "no_rule_passed", "no_variant", "passed"]),
  /** 0-99: the user's place in a rule's rollout. */
  bucket: z.int(),
  /** 0-99: only set when the variant was picked by splitting. */
  variantBucket: z.int().nullable(),
  variantSource: z.enum(["forced", "split"]).nullable(),
  rules: z.array(
    z.object({
      status: RuleStatus,
      enabled: z.boolean(),
      rolloutPercentage: z.int(),
      variantKey: z.string().nullable(),
      conditions: z.array(
        z.object({
          attribute: z.string(),
          operator: ConditionOperator,
          value: z.json(),
          /** What the user sent for this property, or null if they sent nothing. */
          actual: PropertyValue.nullable(),
          matched: z.boolean(),
        }),
      ),
    }),
  ),
});
export type EvaluationTrace = z.infer<typeof EvaluationTrace>;

export const TestFlagResponse = z.object({
  result: EvaluateFlagResponse,
  trace: EvaluationTrace,
});
export type TestFlagResponse = z.infer<typeof TestFlagResponse>;
