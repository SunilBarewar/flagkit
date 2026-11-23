import { setAccountApiKeyHash } from "@flagkit/db";
import { ErrorCode, HttpStatus, NotFoundError } from "@flagkit/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { protectedErrorResponses, security } from "@/common/responses.ts";
import { generateApiKey } from "@/lib/api-key.ts";
import { ApiKeyResponse, IdParams } from "./schemas.ts";

export const generateAccountApiKeyRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/:id/api-key",
    {
      schema: {
        tags: ["accounts"],
        summary: "Generate or rotate the account's API key",
        description: "The key is only returned here once. Rotating invalidates the previous key.",
        security,
        params: IdParams,
        response: { [HttpStatus.OK]: ApiKeyResponse, ...protectedErrorResponses },
      },
    },
    async (request) => {
      const { apiKey, apiKeyHash } = generateApiKey();

      const updated = await setAccountApiKeyHash(request.params.id, apiKeyHash);

      if (!updated) {
        throw new NotFoundError("Account not found", { code: ErrorCode.NOT_FOUND });
      }

      return { message: "Store this key now, it won't be shown again", apiKey };
    },
  );
};
