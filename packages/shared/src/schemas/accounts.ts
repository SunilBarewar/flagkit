import { z } from "zod";

/** Body for both creating an account and logging in. */
export const CredentialsBody = z.object({
  email: z.email(),
  password: z.string().min(8),
});
export type CredentialsBody = z.infer<typeof CredentialsBody>;

/** Data returned when creating an account or logging in. */
export const AuthResponse = z.object({
  email: z.email(),
  token: z.string(),
});
export type AuthResponse = z.infer<typeof AuthResponse>;

/** Never includes the password hash. */
export const AccountResponse = z.object({
  id: z.uuid(),
  email: z.email(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type AccountResponse = z.infer<typeof AccountResponse>;

export const UpdateAccountBody = z
  .object({
    email: z.email().optional(),
    password: z.string().min(8).optional(),
  })
  .refine((body) => body.email !== undefined || body.password !== undefined, {
    message: "Provide at least one of: email, password",
  });
export type UpdateAccountBody = z.infer<typeof UpdateAccountBody>;
