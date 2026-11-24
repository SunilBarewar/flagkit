import { z } from "zod";

import { FlagKey } from "./flags.ts";

export const EvaluateFlagParams = z.object({ flagKey: FlagKey });
export type EvaluateFlagParams = z.infer<typeof EvaluateFlagParams>;

/** Why a flag evaluated to its value. Clients can log or switch on this. */
export const EvaluationReason = z.enum(["DISABLED", "ENABLED"]);
export type EvaluationReason = z.infer<typeof EvaluationReason>;

export const EvaluateFlagResponse = z.object({
  key: z.string(),
  value: z.boolean(),
  reason: EvaluationReason,
});
export type EvaluateFlagResponse = z.infer<typeof EvaluateFlagResponse>;
