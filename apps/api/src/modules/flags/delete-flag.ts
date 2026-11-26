import { deleteFeatureFlag } from "@flagkit/db";
import { ErrorCode, HttpStatus, NotFoundError } from "@flagkit/shared";
import { FlagIdParams, apiSuccessSchema } from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { protectedErrorResponses, security } from "@/common/responses.ts";
import { invalidateFlagConfig } from "@/lib/cache/flag-config-cache.ts";
import { successResponse } from "@/utils/response.ts";

export const deleteFlagRoute: FastifyPluginAsyncZod = async (app) => {
  app.delete(
    "/:flagId",
    {
      schema: {
        tags: ["flags"],
        summary: "Delete a feature flag",
        security,
        params: FlagIdParams,
        response: { [HttpStatus.OK]: apiSuccessSchema(z.null()), ...protectedErrorResponses },
      },
    },
    async (request) => {
      const { projectId, flagId } = request.params;

      const deleted = await deleteFeatureFlag(projectId, flagId);

      if (!deleted) {
        throw new NotFoundError("Flag not found", { code: ErrorCode.NOT_FOUND });
      }

      await invalidateFlagConfig(projectId, deleted.key);

      return successResponse("Flag deleted", null);
    },
  );
};
