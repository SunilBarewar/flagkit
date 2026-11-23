import { findAccountByEmail, insertAccount } from "@flagkit/db";
import { ConflictError, ErrorCode, HttpStatus } from "@flagkit/shared";
import {
  AccountResponse,
  ApiErrorResponse,
  CredentialsBody,
  apiSuccessSchema,
} from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { setAuthCookie } from "@/lib/auth-cookie.ts";
import { signAccountToken } from "@/lib/jwt.ts";
import { hashPassword } from "@/lib/password.ts";
import { successResponse } from "@/utils/response.ts";
import { toAccountResponse } from "./mappers.ts";

export const createAccountRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/",
    {
      schema: {
        tags: ["accounts"],
        summary: "Create an account",
        body: CredentialsBody,
        response: {
          [HttpStatus.OK]: apiSuccessSchema(AccountResponse),
          [HttpStatus.CONFLICT]: ApiErrorResponse,
          [HttpStatus.UNPROCESSABLE_ENTITY]: ApiErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const existingAccount = await findAccountByEmail(email);

      if (existingAccount) {
        throw new ConflictError("Account already exists", { code: ErrorCode.ALREADY_EXISTS });
      }

      const hashedPassword = await hashPassword(password);

      const account = await insertAccount({ email, password: hashedPassword });
      const token = await signAccountToken(account.id);

      setAuthCookie(reply, token);

      return reply
        .code(HttpStatus.OK)
        .send(successResponse("Account created!", toAccountResponse(account)));
    },
  );
};
