import type { Project } from "@flagkit/db";
import { z } from "zod";

export const CreateProjectBody = z.object({
  name: z.string().trim().min(1).max(100),
});

/** Never includes the API key hash. Only the public key ID, so a key can be recognised. */
export const ProjectResponse = z.object({
  id: z.uuid(),
  name: z.string(),
  apiKeyId: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export function toProjectResponse(project: Project): z.infer<typeof ProjectResponse> {
  return {
    id: project.id,
    name: project.name,
    apiKeyId: project.apiKeyId,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

/** The only response that ever carries the plaintext API key. */
export const CreateProjectResponse = z.object({
  message: z.string(),
  project: ProjectResponse,
  apiKey: z.string(),
});

export const ListProjectsResponse = z.object({
  projects: z.array(ProjectResponse),
});
