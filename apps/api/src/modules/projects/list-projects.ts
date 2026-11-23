import { countProjectsByAccountId, listProjectsByAccountId } from "@flagkit/db";
import { HttpStatus } from "@flagkit/shared";
import {
  ApiErrorResponse,
  PaginationQuery,
  ProjectResponse,
  apiPaginatedSchema,
} from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { security } from "@/common/responses.ts";
import { paginatedResponse } from "@/utils/response.ts";
import { toProjectResponse } from "./mappers.ts";

export const listProjectsRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/",
    {
      schema: {
        tags: ["projects"],
        summary: "List your projects",
        security,
        querystring: PaginationQuery,
        response: {
          [HttpStatus.OK]: apiPaginatedSchema(ProjectResponse),
          [HttpStatus.UNAUTHORIZED]: ApiErrorResponse,
        },
      },
    },
    async (request) => {
      const { page, limit } = request.query;

      const [projects, total] = await Promise.all([
        listProjectsByAccountId(request.accountId, { limit, offset: (page - 1) * limit }),
        countProjectsByAccountId(request.accountId),
      ]);

      return paginatedResponse("Projects fetched", projects.map(toProjectResponse), {
        page,
        limit,
        total,
      });
    },
  );
};
