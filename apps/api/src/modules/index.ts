import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { accountProtectedRoutes, accountPublicRoutes } from "./accounts/index.ts";
import { getMeRoute } from "./accounts/get-me.ts";
import { flagProtectedRoutes } from "./flags/index.ts";
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

    // Outside accountProtectedRoutes: that scope only lets an account act on its own `:id`.
    protectedApp.register(getMeRoute, { prefix: "/accounts" });
    protectedApp.register(accountProtectedRoutes, { prefix: "/accounts" });
    protectedApp.register(projectProtectedRoutes, { prefix: "/projects" });
    protectedApp.register(flagProtectedRoutes, { prefix: "/projects/:projectId/flags" });
  });
};
