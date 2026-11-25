import { insertFeatureFlag, insertMultivariateFeatureFlag } from "@flagkit/db";
import { HttpStatus } from "@flagkit/shared";
import {
  ApiErrorResponse,
  CreateFlagBody,
  FlagResponse,
  ProjectIdParams,
  apiSuccessSchema,
} from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { protectedErrorResponses, security } from "@/common/responses.ts";
import { successResponse } from "@/utils/response.ts";
import { toFlagResponse } from "./mappers.ts";

export const createFlagRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/",
    {
      schema: {
        tags: ["flags"],
        summary: "Create a feature flag",
        description:
          "New flags start disabled unless you enable them. The key must be unique within the project. A multivariate flag is created with its variants, which need at least 2 entries and rollout percentages adding up to 100.",
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

      // A taken key throws a Postgres unique violation, which the error handler maps to a 409.
      const { flag, variants } =
        body.type === "multivariate"
          ? await insertMultivariateFeatureFlag({ ...body, projectId }, body.variants)
          : { flag: await insertFeatureFlag({ ...body, projectId }), variants: undefined };

      return reply
        .code(HttpStatus.CREATED)
        .send(successResponse("Flag created", toFlagResponse(flag, variants)));
    },
  );
};
