import { deleteAccount } from "@flagkit/db";
import { ErrorCode, HttpStatus, NotFoundError } from "@flagkit/shared";
import { IdParams, apiSuccessSchema } from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { protectedErrorResponses, security } from "@/common/responses.ts";
import { clearAuthCookie } from "@/lib/auth-cookie.ts";
import { successResponse } from "@/utils/response.ts";

export const deleteAccountRoute: FastifyPluginAsyncZod = async (app) => {
  app.delete(
    "/:id",
    {
      schema: {
        tags: ["accounts"],
        summary: "Delete an account",
        security,
        params: IdParams,
        response: { [HttpStatus.OK]: apiSuccessSchema(z.null()), ...protectedErrorResponses },
      },
    },
    async (request, reply) => {
      const deleted = await deleteAccount(request.params.id);

      if (!deleted) {
        throw new NotFoundError("Account not found", { code: ErrorCode.NOT_FOUND });
      }

      // The session belongs to the account that no longer exists.
      clearAuthCookie(reply);

      return successResponse("Account deleted", null);
    },
  );
};
