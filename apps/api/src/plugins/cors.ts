import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

import { Config } from "@/env.ts";

/**
 * Lets the browser apps listed in CORS_ORIGINS call the API with cookies.
 * `credentials: true` requires explicit origins, so a wildcard is never used.
 * Register before the routes.
 */
export function registerCors(app: FastifyInstance) {
  app.register(cors, {
    origin: Config.CORS_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    maxAge: 60 * 60 * 24,
  });
}
