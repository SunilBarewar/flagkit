import swagger from "@fastify/swagger";
import scalar from "@scalar/fastify-api-reference";
import type { FastifyInstance } from "fastify";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

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
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
      tags: [
        { name: "health", description: "Liveness and readiness checks" },
        { name: "accounts", description: "Account management" },
      ],
    },
    transform: jsonSchemaTransform,
  });

  app.register(scalar, { routePrefix: "/docs" });
}
