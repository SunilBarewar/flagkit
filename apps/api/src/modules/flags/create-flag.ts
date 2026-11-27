import { insertFeatureFlag, insertMultivariateFeatureFlag } from "@flagkit/db";
import { HttpStatus } from "@flagkit/shared";
import {
  ApiErrorResponse,
  CreateFlagBody,
  DEFAULT_RULES,
  FlagResponse,
  ProjectIdParams,
  apiSuccessSchema,
} from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { protectedErrorResponses, security } from "@/common/responses.ts";
import { invalidateFlagConfig } from "@/lib/cache/flag-config-cache.ts";
import { successResponse } from "@/utils/response.ts";
import { assertRulesFitFlag } from "../rules/validate-rules.ts";
import { toFlagResponse } from "./mappers.ts";

export const createFlagRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/",
    {
      schema: {
        tags: ["flags"],
        summary: "Create a feature flag",
        description:
          "New flags start disabled unless you enable them. The key must be unique within the project. A multivariate flag is created with its variants, which need at least 2 entries and rollout percentages adding up to 100. Without `rules`, the flag gets one rule with no conditions at 0%, so it reaches nobody until you edit it.",
        security,
        params: ProjectIdParams,
        body: CreateFlagBody,
        response: {
          [HttpStatus.CREATED]: apiSuccessSchema(FlagResponse),
          [HttpStatus.CONFLICT]: ApiErrorResponse,
          [HttpStatus.UNPROCESSABLE_ENTITY]: ApiErrorResponse,
          ...protectedErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const body = request.body;
      const rules = body.rules ?? DEFAULT_RULES;

      assertRulesFitFlag(
        rules,
        body.type,
        body.type === "multivariate" ? body.variants.map((variant) => variant.key) : [],
      );

      // A taken key throws a Postgres unique violation, which the error handler maps to a 409.
      const created =
        body.type === "multivariate"
          ? await insertMultivariateFeatureFlag({ ...body, projectId }, body.variants, rules)
          : { ...(await insertFeatureFlag({ ...body, projectId }, rules)), variants: undefined };

      // Clears a cached "missing" entry, so evaluating the new flag works right away.
      await invalidateFlagConfig(projectId, created.flag.key);

      return reply
        .code(HttpStatus.CREATED)
        .send(successResponse("Flag created", toFlagResponse(created.flag, created)));
    },
  );
};
