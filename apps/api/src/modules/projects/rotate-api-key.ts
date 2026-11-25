import { replaceProjectApiKey } from "@flagkit/db";
import { ErrorCode, HttpStatus, NotFoundError } from "@flagkit/shared";
import { CreateProjectResponse, ProjectIdParams, apiSuccessSchema } from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { protectedErrorResponses, security } from "@/common/responses.ts";
import { generateApiKey } from "@/lib/api-key.ts";
import { successResponse } from "@/utils/response.ts";
import { toProjectResponse } from "./mappers.ts";

export const rotateApiKeyRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/:projectId/api-key/rotate",
    {
      schema: {
        tags: ["projects"],
        summary: "Rotate a project's API key",
        description:
          "Replaces the key. The old key stops working immediately. The new key is only returned here once.",
        security,
        params: ProjectIdParams,
        response: {
          [HttpStatus.OK]: apiSuccessSchema(CreateProjectResponse),
          ...protectedErrorResponses,
        },
      },
    },
    async (request) => {
      const { apiKey, apiKeyId, apiKeyHash } = generateApiKey();

      const project = await replaceProjectApiKey(request.params.projectId, request.accountId, {
        apiKeyId,
        apiKeyHash,
      });

      if (!project) {
        throw new NotFoundError("Project not found", { code: ErrorCode.NOT_FOUND });
      }

      return successResponse("API key rotated. Store the new key now, it won't be shown again", {
        project: toProjectResponse(project),
        apiKey,
      });
    },
  );
};
