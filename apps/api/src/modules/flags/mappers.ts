import type { FeatureFlag } from "@flagkit/db";
import type { FlagResponse } from "@flagkit/shared/schemas";

export function toFlagResponse(flag: FeatureFlag): FlagResponse {
  return {
    id: flag.id,
    projectId: flag.projectId,
    key: flag.key,
    description: flag.description,
    type: flag.type,
    enabled: flag.enabled,
    rolloutPercentage: flag.rolloutPercentage,
    createdAt: flag.createdAt.toISOString(),
    updatedAt: flag.updatedAt.toISOString(),
  };
}
