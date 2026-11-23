import { SignJWT, jwtVerify } from "jose";

import { Config } from "@/env.ts";

const secret = new TextEncoder().encode(Config.JWT_SECRET);

export const TOKEN_TTL = "7d";

export async function signAccountToken(accountId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(accountId)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secret);
}

/** Returns the account id (the `sub` claim) or throws if the token is invalid/expired. */
export async function verifyAccountToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  if (!payload.sub) throw new Error("Token has no subject");
  return payload.sub;
}
