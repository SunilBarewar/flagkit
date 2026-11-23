import type { Project } from "@flagkit/db";
import type { ProjectResponse } from "@flagkit/shared/schemas";

export function toProjectResponse(project: Project): ProjectResponse {
  return {
    id: project.id,
    name: project.name,
    apiKeyId: project.apiKeyId,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
