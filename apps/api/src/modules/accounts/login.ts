import { findAccountByEmail } from "@flagkit/db";
import { ErrorCode, HttpStatus, UnauthorizedError } from "@flagkit/shared";
import bcrypt from "bcrypt";
import {
  ApiErrorResponse,
  AuthResponse,
  CredentialsBody,
  apiSuccessSchema,
} from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { signAccountToken } from "@/lib/jwt.ts";
import { successResponse } from "@/utils/response.ts";

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("flagkit-dummy-password", 10);

export const loginRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/login",
    {
      schema: {
        tags: ["accounts"],
        summary: "Log in and receive a JWT (valid for 7 days)",
        body: CredentialsBody,
        response: {
          [HttpStatus.OK]: apiSuccessSchema(AuthResponse),
          [HttpStatus.UNAUTHORIZED]: ApiErrorResponse,
          [HttpStatus.UNPROCESSABLE_ENTITY]: ApiErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const account = await findAccountByEmail(email);
      const valid = await bcrypt.compare(password, account?.password ?? DUMMY_HASH);

      if (!account || !valid) {
        throw new UnauthorizedError("Invalid email or password", { code: ErrorCode.UNAUTHORIZED });
      }

      const token = await signAccountToken(account.id);

      return reply.code(HttpStatus.OK).send(successResponse("Logged in!", { email, token }));
    },
  );
};
