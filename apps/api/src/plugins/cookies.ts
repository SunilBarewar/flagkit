import cookie from "@fastify/cookie";
import type { FastifyInstance } from "fastify";

/** Parses the `Cookie` header into `request.cookies` and adds `reply.setCookie`. Register before the routes. */
export function registerCookies(app: FastifyInstance) {
  app.register(cookie);
}
