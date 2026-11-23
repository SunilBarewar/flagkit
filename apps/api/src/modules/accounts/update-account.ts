import { updateAccount } from "@flagkit/db";
import { ErrorCode, HttpStatus, NotFoundError } from "@flagkit/shared";
import {
  AccountResponse,
  ApiErrorResponse,
  IdParams,
  UpdateAccountBody,
  apiSuccessSchema,
} from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { protectedErrorResponses, security } from "@/common/responses.ts";
import { hashPassword } from "@/lib/password.ts";
import { successResponse } from "@/utils/response.ts";
import { toAccountResponse } from "./mappers.ts";

export const updateAccountRoute: FastifyPluginAsyncZod = async (app) => {
  app.patch(
    "/:id",
    {
      schema: {
        tags: ["accounts"],
        summary: "Update an account's email and/or password",
        security,
        params: IdParams,
        body: UpdateAccountBody,
        response: {
          [HttpStatus.OK]: apiSuccessSchema(AccountResponse),
          [HttpStatus.CONFLICT]: ApiErrorResponse,
          [HttpStatus.UNPROCESSABLE_ENTITY]: ApiErrorResponse,
          ...protectedErrorResponses,
        },
      },
    },
    async (request) => {
      const { email, password } = request.body;

      // A taken email throws a Postgres unique violation, which the error handler maps to a 409.
      const account = await updateAccount(request.params.id, {
        ...(email !== undefined && { email }),
        ...(password !== undefined && { password: await hashPassword(password) }),
      });

      if (!account) {
        throw new NotFoundError("Account not found", { code: ErrorCode.NOT_FOUND });
      }

      return successResponse("Account updated", toAccountResponse(account));
    },
  );
};
