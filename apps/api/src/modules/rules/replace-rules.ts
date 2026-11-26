import { findFeatureFlag, listFlagVariants, replaceFlagRules } from "@flagkit/db";
import { ErrorCode, HttpStatus, NotFoundError } from "@flagkit/shared";
import {
  ApiErrorResponse,
  FlagIdParams,
  ReplaceRulesBody,
  RuleResponse,
  apiSuccessSchema,
} from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { protectedErrorResponses, security } from "@/common/responses.ts";
import { invalidateFlagConfig } from "@/lib/cache/flag-config-cache.ts";
import { successResponse } from "@/utils/response.ts";
import { toRuleResponse } from "./mappers.ts";
import { assertRulesFitFlag } from "./validate-rules.ts";

export const replaceRulesRoute: FastifyPluginAsyncZod = async (app) => {
  app.put(
    "/",
    {
      schema: {
        tags: ["rules"],
        summary: "Save a flag's targeting rules",
        description:
          "Send the flag's complete list of rules, in priority order: the first rule a user passes wins. A rule with no conditions matches every user. At least one rule is required.",
        security,
        params: FlagIdParams,
        body: ReplaceRulesBody,
        response: {
          [HttpStatus.OK]: apiSuccessSchema(z.array(RuleResponse)),
          [HttpStatus.UNPROCESSABLE_ENTITY]: ApiErrorResponse,
          ...protectedErrorResponses,
        },
      },
    },
    async (request) => {
      const { projectId, flagId } = request.params;
      const { rules } = request.body;

      const flag = await findFeatureFlag(projectId, flagId);
      if (!flag) {
        throw new NotFoundError("Flag not found", { code: ErrorCode.NOT_FOUND });
      }

      const variants = flag.type === "multivariate" ? await listFlagVariants(flagId) : [];
      assertRulesFitFlag(
        rules,
        flag.type,
        variants.map((variant) => variant.key),
      );

      const saved = await replaceFlagRules(flagId, rules);
      await invalidateFlagConfig(projectId, flag.key);

      return successResponse("Rules saved", saved.map(toRuleResponse));
    },
  );
};
