import { ErrorCode, ValidationError } from "@flagkit/shared";
import type { FlagType, RuleInput } from "@flagkit/shared/schemas";

/** Rules may only force a variant on a multivariate flag, and only one the flag has. */
export function assertRulesFitFlag(rules: RuleInput[], type: FlagType, variantKeys: string[]) {
  for (const rule of rules) {
    if (!rule.variantKey) continue;

    if (type !== "multivariate") {
      throw new ValidationError("Only multivariate flags can force a variant", {
        code: ErrorCode.VALIDATION_FAILED,
      });
    }
    if (!variantKeys.includes(rule.variantKey)) {
      throw new ValidationError(`Unknown variant "${rule.variantKey}"`, {
        code: ErrorCode.VALIDATION_FAILED,
      });
    }
  }
}
