import { countFeatureFlagsByProjectId, listFeatureFlagsByProjectId } from "@flagkit/db";
import { HttpStatus } from "@flagkit/shared";
import {
  FlagResponse,
  PaginationQuery,
  ProjectIdParams,
  apiPaginatedSchema,
} from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { protectedErrorResponses, security } from "@/common/responses.ts";
import { paginatedResponse } from "@/utils/response.ts";
import { toFlagResponse } from "./mappers.ts";

export const listFlagsRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/",
    {
      schema: {
        tags: ["flags"],
        summary: "List a project's feature flags",
        security,
        params: ProjectIdParams,
        querystring: PaginationQuery,
        response: {
          [HttpStatus.OK]: apiPaginatedSchema(FlagResponse),
          ...protectedErrorResponses,
        },
      },
    },
    async (request) => {
      const { projectId } = request.params;
      const { page, limit } = request.query;

      const [flags, total] = await Promise.all([
        listFeatureFlagsByProjectId(projectId, { limit, offset: (page - 1) * limit }),
        countFeatureFlagsByProjectId(projectId),
      ]);

      return paginatedResponse("Flags fetched", flags.map(toFlagResponse), { page, limit, total });
    },
  );
};
