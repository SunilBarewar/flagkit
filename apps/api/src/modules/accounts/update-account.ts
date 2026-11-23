import { updateAccount } from "@flagkit/db";
import { ErrorCode, HttpStatus, NotFoundError } from "@flagkit/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { ErrorResponse, protectedErrorResponses, security } from "@/common/responses.ts";
import { hashPassword } from "@/lib/password.ts";
import { AccountResponse, IdParams, UpdateAccountBody, toAccountResponse } from "./schemas.ts";

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
          [HttpStatus.OK]: AccountResponse,
          [HttpStatus.CONFLICT]: ErrorResponse,
          [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorResponse,
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

      return toAccountResponse(account);
    },
  );
};
