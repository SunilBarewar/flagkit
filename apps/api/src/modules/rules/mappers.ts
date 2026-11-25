import type { RuleWithConditions } from "@flagkit/db";
import type { RuleResponse } from "@flagkit/shared/schemas";

export function toRuleResponse(rule: RuleWithConditions): RuleResponse {
  return {
    id: rule.id,
    priority: rule.priority,
    enabled: rule.enabled,
    rolloutPercentage: rule.rolloutPercentage,
    variantKey: rule.variantKey,
    conditions: rule.conditions.map((condition) => ({
      id: condition.id,
      attribute: condition.attribute,
      operator: condition.operator,
      value: condition.value as RuleResponse["conditions"][number]["value"],
    })),
  };
}
