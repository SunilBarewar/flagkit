import { z } from "zod";

export const CreateProjectBody = z.object({
  name: z.string().trim().min(1).max(100),
});
export type CreateProjectBody = z.infer<typeof CreateProjectBody>;

/** Never includes the API key hash. Only the public key ID, so a key can be recognised. */
export const ProjectResponse = z.object({
  id: z.uuid(),
  name: z.string(),
  apiKeyId: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type ProjectResponse = z.infer<typeof ProjectResponse>;

/** The only response that ever carries the plaintext API key. */
export const CreateProjectResponse = z.object({
  project: ProjectResponse,
  apiKey: z.string(),
});
export type CreateProjectResponse = z.infer<typeof CreateProjectResponse>;
