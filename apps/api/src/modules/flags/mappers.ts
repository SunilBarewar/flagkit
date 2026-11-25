import type { FeatureFlag, FlagVariant } from "@flagkit/db";
import type { FlagResponse } from "@flagkit/shared/schemas";

import { toVariantResponse } from "../variants/mappers.ts";

export function toFlagResponse(flag: FeatureFlag, variants?: FlagVariant[]): FlagResponse {
  return {
    id: flag.id,
    projectId: flag.projectId,
    key: flag.key,
    description: flag.description,
    type: flag.type,
    enabled: flag.enabled,
    rolloutPercentage: flag.rolloutPercentage,
    ...(variants && { variants: variants.map(toVariantResponse) }),
    createdAt: flag.createdAt.toISOString(),
    updatedAt: flag.updatedAt.toISOString(),
  };
}
