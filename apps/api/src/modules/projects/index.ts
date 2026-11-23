import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createProjectRoute } from "./create-project.ts";
import { listProjectsRoute } from "./list-projects.ts";

/**
 * Routes on the caller's own projects. Registered inside the shared protected scope
 * (see modules/index.ts), so a valid JWT is already guaranteed and `request.accountId` is set.
 */
export const projectProtectedRoutes: FastifyPluginAsyncZod = async (app) => {
  app.register(createProjectRoute);
  app.register(listProjectsRoute);
};
