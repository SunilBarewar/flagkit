import { findAccountById } from "@flagkit/db";
import { ErrorCode, HttpStatus, UnauthorizedError } from "@flagkit/shared";
import { AccountResponse, ApiErrorResponse, apiSuccessSchema } from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { security } from "@/common/responses.ts";
import { successResponse } from "@/utils/response.ts";
import { toAccountResponse } from "./mappers.ts";

export const getMeRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/me",
    {
      schema: {
        tags: ["accounts"],
        summary: "Get the account the session cookie belongs to",
        security,
        response: {
          [HttpStatus.OK]: apiSuccessSchema(AccountResponse),
          [HttpStatus.UNAUTHORIZED]: ApiErrorResponse,
        },
      },
    },
    async (request) => {
      const account = await findAccountById(request.accountId);

      // A valid token for an account that has since been deleted is no session at all.
      if (!account) {
        throw new UnauthorizedError("Invalid session", { code: ErrorCode.UNAUTHORIZED });
      }

      return successResponse("Account fetched", toAccountResponse(account));
    },
  );
};
