import { findFeatureFlagByKey, listFlagVariants, listRulesWithConditions } from "@flagkit/db";
import { ErrorCode, HttpStatus, NotFoundError } from "@flagkit/shared";
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
          "Send the user in the body. Their `properties` are matched against the flag's targeting rules, and their `userId` decides where they fall in a rule's percentage rollout. A multivariate flag also returns the chosen `variant` and its `payload`.",
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

      const [rules, variants] = await Promise.all([
        listRulesWithConditions(flag.id),
        flag.type === "multivariate" ? listFlagVariants(flag.id) : [],
      ]);

      return successResponse("Flag evaluated", evaluateFlag(flag, rules, request.body, variants));
    },
  );
};
