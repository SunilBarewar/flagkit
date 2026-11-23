import { isProduction } from "@flagkit/shared";
import type { FastifyReply } from "fastify";

import { TOKEN_TTL_SECONDS } from "@/lib/jwt.ts";

export const AUTH_COOKIE_NAME = "flagkit_token";

/**
 * The session JWT lives in an HttpOnly cookie so page JavaScript can never read it.
 * SameSite=Lax keeps the browser from sending it on cross-site POSTs (CSRF), and
 * `secure` limits it to HTTPS in production. Set and clear must use the same
 * path/flags, or the browser keeps the old cookie.
 */
const cookieOptions = {
  path: "/",
  httpOnly: true,
  secure: isProduction(),
  sameSite: "lax",
} as const;

export function setAuthCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(AUTH_COOKIE_NAME, token, { ...cookieOptions, maxAge: TOKEN_TTL_SECONDS });
}

export function clearAuthCookie(reply: FastifyReply): void {
  reply.clearCookie(AUTH_COOKIE_NAME, cookieOptions);
}
