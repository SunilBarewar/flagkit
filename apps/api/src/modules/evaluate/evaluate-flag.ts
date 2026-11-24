import { findFeatureFlagByKey } from "@flagkit/db";
import { BadRequestError, ErrorCode, HttpStatus, NotFoundError } from "@flagkit/shared";
import {
  ApiErrorResponse,
  EvaluateFlagParams,
  EvaluationContext,
  EvaluateFlagResponse,
  apiSuccessSchema,
} from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { apiKeySecurity } from "@/common/responses.ts";
import { successResponse } from "@/utils/response.ts";
import { evaluateFlag } from "./evaluate.ts";

export const evaluateFlagRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/:flagKey",
    {
      schema: {
        tags: ["evaluate"],
        summary: "Evaluate a feature flag",
        description:
          "Send the user in the body. Their `userId` decides where they fall in a percentage rollout.",
        security: apiKeySecurity,
        params: EvaluateFlagParams,
        body: EvaluationContext,
        response: {
          [HttpStatus.OK]: apiSuccessSchema(EvaluateFlagResponse),
          [HttpStatus.BAD_REQUEST]: ApiErrorResponse,
          [HttpStatus.UNAUTHORIZED]: ApiErrorResponse,
          [HttpStatus.NOT_FOUND]: ApiErrorResponse,
        },
      },
    },
    async (request) => {
      const flag = await findFeatureFlagByKey(request.projectId, request.params.flagKey);

      if (!flag) {
        throw new NotFoundError("Flag not found", { code: ErrorCode.NOT_FOUND });
      }

      if (flag.type !== "boolean") {
        throw new BadRequestError("Only boolean flags can be evaluated for now", {
          code: ErrorCode.BAD_REQUEST,
        });
      }

      return successResponse("Flag evaluated", evaluateFlag(flag, request.body));
    },
  );
};
