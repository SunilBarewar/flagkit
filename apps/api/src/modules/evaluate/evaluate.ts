import type { FeatureFlag } from "@flagkit/db";
import type { EvaluateFlagResponse } from "@flagkit/shared/schemas";

/**
 * Evaluates a boolean flag. Pure: no I/O, so it is trivial to test.
 *
 * For now this is the simplest possible rule: an inactive flag is off for everyone,
 * an active flag serves its default value. Targeting rules, rollout and variants
 * will layer on top of this later.
 */
export function evaluateFlag(
  flag: Pick<FeatureFlag, "key" | "isActive" | "defaultValue">,
): EvaluateFlagResponse {
  if (!flag.isActive) {
    return { key: flag.key, value: false, reason: "DISABLED" };
  }

  return { key: flag.key, value: flag.defaultValue, reason: "DEFAULT" };
}
