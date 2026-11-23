import { findAccountById } from "@flagkit/db";
import { ErrorCode, HttpStatus, NotFoundError } from "@flagkit/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { protectedErrorResponses, security } from "@/common/responses.ts";
import { AccountResponse, IdParams, toAccountResponse } from "./schemas.ts";

export const getAccountRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/:id",
    {
      schema: {
        tags: ["accounts"],
        summary: "Get an account by id",
        security,
        params: IdParams,
        response: { [HttpStatus.OK]: AccountResponse, ...protectedErrorResponses },
      },
    },
    async (request) => {
      const account = await findAccountById(request.params.id);

      if (!account) {
        throw new NotFoundError("Account not found", { code: ErrorCode.NOT_FOUND });
      }

      return toAccountResponse(account);
    },
  );
};
