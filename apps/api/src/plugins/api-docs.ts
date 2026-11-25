import swagger from "@fastify/swagger";
import scalar from "@scalar/fastify-api-reference";
import type { FastifyInstance } from "fastify";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie.ts";

/**
 * @fastify/swagger generates the OpenAPI spec from the route schemas,
 * Scalar renders it at /docs. Register before the routes.
 */
export function registerApiDocs(app: FastifyInstance) {
  app.register(swagger, {
    openapi: {
      info: {
        title: "Flagkit API",
        description: "Webhook delivery platform API",
        version: "0.0.0",
      },
      components: {
        securitySchemes: {
          cookieAuth: { type: "apiKey", in: "cookie", name: AUTH_COOKIE_NAME },
          apiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" },
        },
      },
      tags: [
        { name: "health", description: "Liveness and readiness checks" },
        { name: "accounts", description: "Account management" },
        { name: "projects", description: "Projects" },
        { name: "flags", description: "Feature flags" },
        { name: "variants", description: "Variants of multivariate flags" },
        { name: "rules", description: "Targeting rules: who a flag is rolled out to" },
      ],
    },
    transform: jsonSchemaTransform,
  });

  app.register(scalar, { routePrefix: "/docs" });
}
