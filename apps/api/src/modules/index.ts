import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { accountProtectedRoutes, accountPublicRoutes } from "./accounts/index.ts";
import { healthRoutes } from "./health/index.ts";
import { projectProtectedRoutes } from "./projects/index.ts";

/** Single place where every route module is registered (and given its URL prefix). */
export const registerRoutes: FastifyPluginAsyncZod = async (app) => {
  // Public routes: no session needed.
  app.register(healthRoutes);
  app.register(accountPublicRoutes, { prefix: "/accounts" });

  // Protected routes: every module registered in this scope requires a valid session cookie.
  app.register(async (protectedApp) => {
    protectedApp.addHook("onRequest", protectedApp.authenticate);

    protectedApp.register(accountProtectedRoutes, { prefix: "/accounts" });
    protectedApp.register(projectProtectedRoutes, { prefix: "/projects" });
  });
};
