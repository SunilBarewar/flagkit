import type { FeatureFlag, FlagVariant, RuleWithConditions } from "@flagkit/db";
import type { FlagResponse } from "@flagkit/shared/schemas";

import { toRuleResponse } from "../rules/mappers.ts";
import { toVariantResponse } from "../variants/mappers.ts";

interface FlagDetails {
  rules?: RuleWithConditions[];
  variants?: FlagVariant[];
}

export function toFlagResponse(
  flag: FeatureFlag,
  { rules, variants }: FlagDetails = {},
): FlagResponse {
  return {
    id: flag.id,
    projectId: flag.projectId,
    key: flag.key,
    description: flag.description,
    type: flag.type,
    enabled: flag.enabled,
    ...(rules && { rules: rules.map(toRuleResponse) }),
    ...(variants && { variants: variants.map(toVariantResponse) }),
    createdAt: flag.createdAt.toISOString(),
    updatedAt: flag.updatedAt.toISOString(),
  };
}
