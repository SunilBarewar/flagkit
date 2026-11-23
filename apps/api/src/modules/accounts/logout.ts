import { HttpStatus } from "@flagkit/shared";
import { apiSuccessSchema } from "@flagkit/shared/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { clearAuthCookie } from "@/lib/auth-cookie.ts";
import { successResponse } from "@/utils/response.ts";

export const logoutRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/logout",
    {
      schema: {
        tags: ["accounts"],
        summary: "Log out by clearing the session cookie",
        response: { [HttpStatus.OK]: apiSuccessSchema(z.null()) },
      },
    },
    async (_request, reply) => {
      clearAuthCookie(reply);

      return successResponse("Logged out", null);
    },
  );
};
