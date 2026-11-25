import { findFeatureFlag } from "@flagkit/db";
import type { FeatureFlag } from "@flagkit/db";
import { ErrorCode, NotFoundError, ValidationError } from "@flagkit/shared";

/** The flag a variant route works on: it must exist in the project and be multivariate. */
export async function findMultivariateFlag(
  projectId: string,
  flagId: string,
): Promise<FeatureFlag> {
  const flag = await findFeatureFlag(projectId, flagId);

  if (!flag) {
    throw new NotFoundError("Flag not found", { code: ErrorCode.NOT_FOUND });
  }
  if (flag.type !== "multivariate") {
    throw new ValidationError("Only multivariate flags have variants", {
      code: ErrorCode.VALIDATION_FAILED,
    });
  }

  return flag;
}
