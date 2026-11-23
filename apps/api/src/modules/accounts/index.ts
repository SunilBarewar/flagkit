import { ErrorCode, ForbiddenError } from "@flagkit/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createAccountRoute } from "./create-account.ts";
import { deleteAccountRoute } from "./delete-account.ts";
import { getAccountRoute } from "./get-account.ts";
import { loginRoute } from "./login.ts";
import { updateAccountRoute } from "./update-account.ts";

/** Signup and login: no token needed. */
export const accountPublicRoutes: FastifyPluginAsyncZod = async (app) => {
  app.register(createAccountRoute);
  app.register(loginRoute);
};

/**
 * Routes on a specific account. Registered inside the shared protected scope
 * (see modules/index.ts), so a valid JWT is already guaranteed here.
 */
export const accountProtectedRoutes: FastifyPluginAsyncZod = async (app) => {
  // Authorization: an account may only act on itself. Runs after params validation.
  app.addHook("preHandler", async (request) => {
    const { id } = request.params as { id: string };
    if (id !== request.accountId) {
      throw new ForbiddenError("You can only access your own account", {
        code: ErrorCode.FORBIDDEN,
      });
    }
  });

  app.register(getAccountRoute);
  app.register(updateAccountRoute);
  app.register(deleteAccountRoute);
};
