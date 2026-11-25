import { findFeatureFlag, listFlagVariants, listRulesWithConditions } from "@flagkit/db";
import { ErrorCode, HttpStatus, NotFoundError } from "@flagkit/shared";
import {
  EvaluationContext,
  FlagIdParams,
  TestFlagResponse,
  apiSuccessSchema,
} from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { protectedErrorResponses, security } from "@/common/responses.ts";
import { successResponse } from "@/utils/response.ts";
import { explainEvaluation } from "../evaluate/evaluate.ts";

export const testFlagRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/:flagId/evaluate",
    {
      schema: {
        tags: ["flags"],
        summary: "Test a feature flag for a user",
        description:
          "Evaluates the saved flag for the user in the body, like the SDK endpoint does, but with your session instead of an API key. Also returns how the result was reached: the user's buckets and what happened to each rule.",
        security,
        params: FlagIdParams,
        body: EvaluationContext,
        response: {
          [HttpStatus.OK]: apiSuccessSchema(TestFlagResponse),
          ...protectedErrorResponses,
        },
      },
    },
    async (request) => {
      const { projectId, flagId } = request.params;

      const flag = await findFeatureFlag(projectId, flagId);
      if (!flag) {
        throw new NotFoundError("Flag not found", { code: ErrorCode.NOT_FOUND });
      }

      const [rules, variants] = await Promise.all([
        listRulesWithConditions(flag.id),
        flag.type === "multivariate" ? listFlagVariants(flag.id) : [],
      ]);

      return successResponse(
        "Flag evaluated",
        explainEvaluation(flag, rules, request.body, variants),
      );
    },
  );
};
