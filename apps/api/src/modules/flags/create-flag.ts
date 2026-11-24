import { insertFeatureFlag } from "@flagkit/db";
import { ErrorCode, HttpStatus, ValidationError } from "@flagkit/shared";
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
          "New flags start disabled unless you enable them. The key must be unique within the project.",
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
      const { type, ...rest } = request.body;

      if (type === "multivariate") {
        throw new ValidationError("Multivariate flags are not supported yet", {
          code: ErrorCode.VALIDATION_FAILED,
        });
      }

      // A taken key throws a Postgres unique violation, which the error handler maps to a 409.
      const flag = await insertFeatureFlag({ ...rest, type, projectId: request.params.projectId });

      return reply
        .code(HttpStatus.CREATED)
        .send(successResponse("Flag created", toFlagResponse(flag)));
    },
  );
};
