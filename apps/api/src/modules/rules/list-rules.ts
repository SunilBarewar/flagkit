import { findFeatureFlag, listRulesWithConditions } from "@flagkit/db";
import { ErrorCode, HttpStatus, NotFoundError } from "@flagkit/shared";
import { FlagIdParams, RuleResponse, apiSuccessSchema } from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { protectedErrorResponses, security } from "@/common/responses.ts";
import { successResponse } from "@/utils/response.ts";
import { toRuleResponse } from "./mappers.ts";

export const listRulesRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/",
    {
      schema: {
        tags: ["rules"],
        summary: "List a flag's targeting rules in priority order",
        security,
        params: FlagIdParams,
        response: {
          [HttpStatus.OK]: apiSuccessSchema(z.array(RuleResponse)),
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

      const rules = await listRulesWithConditions(flagId);

      return successResponse("Rules fetched", rules.map(toRuleResponse));
    },
  );
};
