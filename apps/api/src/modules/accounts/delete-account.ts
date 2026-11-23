import { deleteAccount } from "@flagkit/db";
import { ErrorCode, HttpStatus, NotFoundError } from "@flagkit/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { MessageResponse, protectedErrorResponses, security } from "@/common/responses.ts";
import { IdParams } from "./schemas.ts";

export const deleteAccountRoute: FastifyPluginAsyncZod = async (app) => {
  app.delete(
    "/:id",
    {
      schema: {
        tags: ["accounts"],
        summary: "Delete an account",
        security,
        params: IdParams,
        response: { [HttpStatus.OK]: MessageResponse, ...protectedErrorResponses },
      },
    },
    async (request) => {
      const deleted = await deleteAccount(request.params.id);

      if (!deleted) {
        throw new NotFoundError("Account not found", { code: ErrorCode.NOT_FOUND });
      }

      return { message: "Account deleted" };
    },
  );
};
