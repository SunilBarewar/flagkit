import { updateFeatureFlag } from "@flagkit/db";
import { ErrorCode, HttpStatus, NotFoundError } from "@flagkit/shared";
import {
  ApiErrorResponse,
  FlagIdParams,
  FlagResponse,
  UpdateFlagBody,
  apiSuccessSchema,
} from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { protectedErrorResponses, security } from "@/common/responses.ts";
import { invalidateFlagConfig } from "@/lib/cache/flag-config-cache.ts";
import { successResponse } from "@/utils/response.ts";
import { toFlagResponse } from "./mappers.ts";

export const updateFlagRoute: FastifyPluginAsyncZod = async (app) => {
  app.patch(
    "/:flagId",
    {
      schema: {
        tags: ["flags"],
        summary: "Update a feature flag's description, switch or default configuration",
        description: "The key and type can't be changed.",
        security,
        params: FlagIdParams,
        body: UpdateFlagBody,
        response: {
          [HttpStatus.OK]: apiSuccessSchema(FlagResponse),
          [HttpStatus.UNPROCESSABLE_ENTITY]: ApiErrorResponse,
          ...protectedErrorResponses,
        },
      },
    },
    async (request) => {
      const { projectId, flagId } = request.params;

      const flag = await updateFeatureFlag(projectId, flagId, request.body);

      if (!flag) {
        throw new NotFoundError("Flag not found", { code: ErrorCode.NOT_FOUND });
      }

      await invalidateFlagConfig(projectId, flag.key);

      return successResponse("Flag updated", toFlagResponse(flag));
    },
  );
};
