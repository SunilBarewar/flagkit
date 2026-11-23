import { insertProject } from "@flagkit/db";
import { HttpStatus } from "@flagkit/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { ErrorResponse, security } from "@/common/responses.ts";
import { generateApiKey } from "@/lib/api-key.ts";
import { CreateProjectBody, CreateProjectResponse, toProjectResponse } from "./schemas.ts";

export const createProjectRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/",
    {
      schema: {
        tags: ["projects"],
        summary: "Create a project",
        description: "The API key is only returned here once. Store it now.",
        security,
        body: CreateProjectBody,
        response: {
          [HttpStatus.CREATED]: CreateProjectResponse,
          [HttpStatus.UNAUTHORIZED]: ErrorResponse,
          [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { apiKey, apiKeyId, apiKeyHash } = generateApiKey();

      const project = await insertProject({
        accountId: request.accountId,
        name: request.body.name,
        apiKeyId,
        apiKeyHash,
      });

      return reply.code(HttpStatus.CREATED).send({
        message: "Store this key now, it won't be shown again",
        project: toProjectResponse(project),
        apiKey,
      });
    },
  );
};
