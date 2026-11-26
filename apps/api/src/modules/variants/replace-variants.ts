import { replaceFlagVariants } from "@flagkit/db";
import { HttpStatus } from "@flagkit/shared";
import {
  ApiErrorResponse,
  FlagIdParams,
  ReplaceVariantsBody,
  VariantResponse,
  apiSuccessSchema,
} from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { protectedErrorResponses, security } from "@/common/responses.ts";
import { invalidateFlagConfig } from "@/lib/cache/flag-config-cache.ts";
import { successResponse } from "@/utils/response.ts";
import { findMultivariateFlag } from "./find-multivariate-flag.ts";
import { toVariantResponse } from "./mappers.ts";

export const replaceVariantsRoute: FastifyPluginAsyncZod = async (app) => {
  app.put(
    "/",
    {
      schema: {
        tags: ["variants"],
        summary: "Save a multivariate flag's variants",
        description:
          "Send the flag's complete set of variants. Variants are matched by key: existing ones are updated, new ones are created and any left out are deleted. The rollout percentages must add up to 100.",
        security,
        params: FlagIdParams,
        body: ReplaceVariantsBody,
        response: {
          [HttpStatus.OK]: apiSuccessSchema(z.array(VariantResponse)),
          [HttpStatus.UNPROCESSABLE_ENTITY]: ApiErrorResponse,
          ...protectedErrorResponses,
        },
      },
    },
    async (request) => {
      const { projectId, flagId } = request.params;

      const flag = await findMultivariateFlag(projectId, flagId);

      const variants = await replaceFlagVariants(flagId, request.body.variants);
      await invalidateFlagConfig(projectId, flag.key);

      return successResponse("Variants saved", variants.map(toVariantResponse));
    },
  );
};
