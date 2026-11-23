import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import { Config } from "@/env.ts";
import { registerApiDocs } from "@/plugins/api-docs.ts";
import { registerAuth } from "@/plugins/auth.ts";
import { registerCors } from "@/plugins/cors.ts";
import { registerErrorHandler } from "@/plugins/error-handler.ts";
import { registerRoutes } from "@/modules/index.ts";

export function buildApp() {
  const app = Fastify({ logger: { level: Config.LOG_LEVEL } });

  // Zod schemas on routes drive validation, serialization and the OpenAPI docs.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  registerErrorHandler(app);
  registerCors(app);
  app.register(registerAuth);

  // Must be registered before the routes so they show up in the docs.
  registerApiDocs(app);

  app.register(registerRoutes);

  return app;
}
