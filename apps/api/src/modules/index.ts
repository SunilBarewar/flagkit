import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { accountProtectedRoutes, accountPublicRoutes } from "./accounts/index.ts";
import { healthRoutes } from "./health/index.ts";

/** Single place where every route module is registered (and given its URL prefix). */
export const registerRoutes: FastifyPluginAsyncZod = async (app) => {
  // Public routes: no token needed.
  app.register(healthRoutes);
  app.register(accountPublicRoutes, { prefix: "/accounts" });

  // Protected routes: every module registered in this scope requires a valid JWT.
  app.register(async (protectedApp) => {
    protectedApp.addHook("onRequest", protectedApp.authenticate);

    protectedApp.register(accountProtectedRoutes, { prefix: "/accounts" });
  });
};
