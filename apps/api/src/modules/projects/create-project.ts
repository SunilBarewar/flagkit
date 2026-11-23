import { insertProject } from "@flagkit/db";
import { HttpStatus } from "@flagkit/shared";
import {
  ApiErrorResponse,
  CreateProjectBody,
  CreateProjectResponse,
  apiSuccessSchema,
} from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { security } from "@/common/responses.ts";
import { generateApiKey } from "@/lib/api-key.ts";
import { successResponse } from "@/utils/response.ts";
import { toProjectResponse } from "./mappers.ts";

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
          [HttpStatus.CREATED]: apiSuccessSchema(CreateProjectResponse),
          [HttpStatus.UNAUTHORIZED]: ApiErrorResponse,
          [HttpStatus.UNPROCESSABLE_ENTITY]: ApiErrorResponse,
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

      return reply.code(HttpStatus.CREATED).send(
        successResponse("Project created. Store the API key now, it won't be shown again", {
          project: toProjectResponse(project),
          apiKey,
        }),
      );
    },
  );
};
