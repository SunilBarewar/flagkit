import { findAccountByEmail, insertAccount } from "@flagkit/db";
import { ConflictError, ErrorCode, HttpStatus } from "@flagkit/shared";
import { AuthResponse, CredentialsBody, ErrorResponse } from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { signAccountToken } from "@/lib/jwt.ts";
import { hashPassword } from "@/lib/password.ts";

export const createAccountRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/",
    {
      schema: {
        tags: ["accounts"],
        summary: "Create an account",
        body: CredentialsBody,
        response: {
          [HttpStatus.OK]: AuthResponse,
          [HttpStatus.CONFLICT]: ErrorResponse,
          [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorResponse,
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

      return reply.code(HttpStatus.OK).send({ message: "Account created!", email, token });
    },
  );
};
