import { findFeatureFlag, listFlagVariants } from "@flagkit/db";
import { ErrorCode, HttpStatus, NotFoundError } from "@flagkit/shared";
import { FlagIdParams, FlagResponse, apiSuccessSchema } from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { protectedErrorResponses, security } from "@/common/responses.ts";
import { successResponse } from "@/utils/response.ts";
import { toFlagResponse } from "./mappers.ts";

export const getFlagRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/:flagId",
    {
      schema: {
        tags: ["flags"],
        summary: "Get a feature flag",
        security,
        params: FlagIdParams,
        response: { [HttpStatus.OK]: apiSuccessSchema(FlagResponse), ...protectedErrorResponses },
      },
    },
    async (request) => {
      const { projectId, flagId } = request.params;

      const flag = await findFeatureFlag(projectId, flagId);

      if (!flag) {
        throw new NotFoundError("Flag not found", { code: ErrorCode.NOT_FOUND });
      }

      const variants = flag.type === "multivariate" ? await listFlagVariants(flag.id) : undefined;

      return successResponse("Flag fetched", toFlagResponse(flag, variants));
    },
  );
};
