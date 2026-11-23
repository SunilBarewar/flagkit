import type { Account } from "@flagkit/db";
import { z } from "zod";

/** Body for both creating an account and logging in. */
export const CredentialsBody = z.object({
  email: z.email(),
  password: z.string().min(8),
});

/** Response for both creating an account and logging in. */
export const AuthResponse = z.object({
  message: z.string(),
  email: z.email(),
  token: z.string(),
});

export const IdParams = z.object({ id: z.uuid() });

/** Never includes the password hash or API key hash. */
export const AccountResponse = z.object({
  id: z.uuid(),
  email: z.email(),
  hasApiKey: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export function toAccountResponse(account: Account): z.infer<typeof AccountResponse> {
  return {
    id: account.id,
    email: account.email,
    hasApiKey: account.apiKeyHash !== null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

export const UpdateAccountBody = z
  .object({
    email: z.email().optional(),
    password: z.string().min(8).optional(),
  })
  .refine((body) => body.email !== undefined || body.password !== undefined, {
    message: "Provide at least one of: email, password",
  });

export const ApiKeyResponse = z.object({
  message: z.string(),
  apiKey: z.string(),
});
