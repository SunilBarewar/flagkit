import { listProjectsByAccountId } from "@flagkit/db";
import { HttpStatus } from "@flagkit/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { ErrorResponse, security } from "@/common/responses.ts";
import { ListProjectsResponse, toProjectResponse } from "./schemas.ts";

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
