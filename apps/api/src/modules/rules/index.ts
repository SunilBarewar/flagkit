import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { listRulesRoute } from "./list-rules.ts";
import { replaceRulesRoute } from "./replace-rules.ts";

/**
 * Routes on a flag's targeting rules, registered under `/projects/:projectId/flags/:flagId/rules`.
 * Nested inside the flag routes, so the project ownership check has already run.
 */
export const ruleProtectedRoutes: FastifyPluginAsyncZod = async (app) => {
  app.register(listRulesRoute);
  app.register(replaceRulesRoute);
};
