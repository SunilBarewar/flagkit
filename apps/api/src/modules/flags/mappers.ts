import type { FeatureFlag } from "@flagkit/db";
import type { FlagResponse } from "@flagkit/shared/schemas";

export function toFlagResponse(flag: FeatureFlag): FlagResponse {
  return {
    id: flag.id,
    projectId: flag.projectId,
    key: flag.key,
    description: flag.description,
    type: flag.type,
    isActive: flag.isActive,
    defaultValue: flag.defaultValue,
    rolloutPercentage: flag.rolloutPercentage,
    createdAt: flag.createdAt.toISOString(),
    updatedAt: flag.updatedAt.toISOString(),
  };
}
