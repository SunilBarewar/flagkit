import { z } from "zod";

import { FlagKey } from "./flags.ts";

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
