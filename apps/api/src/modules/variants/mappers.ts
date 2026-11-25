import type { FlagVariant } from "@flagkit/db";
import type { VariantResponse } from "@flagkit/shared/schemas";

export function toVariantResponse(variant: FlagVariant): VariantResponse {
  return {
    id: variant.id,
    flagId: variant.flagId,
    key: variant.key,
    description: variant.description,
    payload: (variant.payload ?? null) as VariantResponse["payload"],
    rolloutPercentage: variant.rolloutPercentage,
    createdAt: variant.createdAt.toISOString(),
  };
}
