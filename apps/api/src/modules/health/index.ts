import { pingDatabase } from "@flagkit/db";
import { HttpStatus } from "@flagkit/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

const statusResponse = <S extends string>(status: S) => z.object({ status: z.literal(status) });

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/health",
    {
      schema: {
        tags: ["health"],
        summary: "Liveness check",
        response: { [HttpStatus.OK]: statusResponse("ok") },
      },
    },
    async () => ({ status: "ok" as const }),
  );

  app.get(
    "/health/db",
    {
      schema: {
        tags: ["health"],
        summary: "Database connectivity check",
        response: {
          [HttpStatus.OK]: statusResponse("ok"),
          [HttpStatus.SERVICE_UNAVAILABLE]: statusResponse("unavailable"),
        },
      },
    },
    async (_request, reply) => {
      try {
        await pingDatabase();
        return { status: "ok" as const };
      } catch (error) {
        app.log.error(error, "database health check failed");
        return reply.code(HttpStatus.SERVICE_UNAVAILABLE).send({ status: "unavailable" });
      }
    },
  );
};
