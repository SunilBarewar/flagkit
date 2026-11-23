import { findAccountById } from "@flagkit/db";
import { ErrorCode, HttpStatus, NotFoundError } from "@flagkit/shared";
import { AccountResponse, IdParams } from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { protectedErrorResponses, security } from "@/common/responses.ts";
import { toAccountResponse } from "./mappers.ts";

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
