import type { FeatureFlag } from "@flagkit/db";
import type { EvaluateFlagResponse } from "@flagkit/shared/schemas";

/**
 * Evaluates a boolean flag. Pure: no I/O, so it is trivial to test.
 *
 * For now this is the simplest possible rule: a disabled flag is off for everyone,
 * an enabled flag is on for everyone. Rollout percentage, targeting rules and variants
 * will layer on top of this later.
 */
export function evaluateFlag(flag: Pick<FeatureFlag, "key" | "enabled">): EvaluateFlagResponse {
  if (!flag.enabled) {
    return { key: flag.key, value: false, reason: "DISABLED" };
  }

  return { key: flag.key, value: true, reason: "ENABLED" };
}
