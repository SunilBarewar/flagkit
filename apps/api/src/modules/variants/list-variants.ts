import { listFlagVariants } from "@flagkit/db";
import { HttpStatus } from "@flagkit/shared";
import {
  ApiErrorResponse,
  FlagIdParams,
  VariantResponse,
  apiSuccessSchema,
} from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { protectedErrorResponses, security } from "@/common/responses.ts";
import { successResponse } from "@/utils/response.ts";
import { findMultivariateFlag } from "./find-multivariate-flag.ts";
import { toVariantResponse } from "./mappers.ts";

export const listVariantsRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/",
    {
      schema: {
        tags: ["variants"],
        summary: "List a flag's variants",
        security,
        params: FlagIdParams,
        response: {
          [HttpStatus.OK]: apiSuccessSchema(z.array(VariantResponse)),
          [HttpStatus.UNPROCESSABLE_ENTITY]: ApiErrorResponse,
          ...protectedErrorResponses,
        },
      },
    },
    async (request) => {
      const { projectId, flagId } = request.params;

      await findMultivariateFlag(projectId, flagId);

      const variants = await listFlagVariants(flagId);

      return successResponse("Variants fetched", variants.map(toVariantResponse));
    },
  );
};
