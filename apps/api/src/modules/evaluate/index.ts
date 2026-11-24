import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { evaluateFlagRoute } from "./evaluate-flag.ts";

/**
 * SDK routes, registered under `/evaluate`. They authenticate with the project API key
 * (`x-api-key`), not a session cookie, and only ever see the key's own project.
 */
export const evaluateRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticateApiKey);

  app.register(evaluateFlagRoute);
};
