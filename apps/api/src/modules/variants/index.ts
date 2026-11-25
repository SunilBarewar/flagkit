import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { listVariantsRoute } from "./list-variants.ts";
import { replaceVariantsRoute } from "./replace-variants.ts";

/**
 * Routes on a flag's variants, registered under `/projects/:projectId/flags/:flagId/variants`.
 * Nested inside the flag routes, so the project ownership check has already run.
 */
export const variantProtectedRoutes: FastifyPluginAsyncZod = async (app) => {
  app.register(listVariantsRoute);
  app.register(replaceVariantsRoute);
};
