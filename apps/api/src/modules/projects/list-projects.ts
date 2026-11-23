import { listProjectsByAccountId } from "@flagkit/db";
import { HttpStatus } from "@flagkit/shared";
import { ErrorResponse, ListProjectsResponse } from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { security } from "@/common/responses.ts";
import { toProjectResponse } from "./mappers.ts";

export const listProjectsRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/",
    {
      schema: {
        tags: ["projects"],
        summary: "List your projects",
        security,
        response: {
          [HttpStatus.OK]: ListProjectsResponse,
          [HttpStatus.UNAUTHORIZED]: ErrorResponse,
        },
      },
    },
    async (request) => {
      const projects = await listProjectsByAccountId(request.accountId);

      return { projects: projects.map(toProjectResponse) };
    },
  );
};
