import { findProjectByIdAndAccountId } from "@flagkit/db";
import { ErrorCode, NotFoundError } from "@flagkit/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createFlagRoute } from "./create-flag.ts";
import { deleteFlagRoute } from "./delete-flag.ts";
import { getFlagRoute } from "./get-flag.ts";
import { listFlagsRoute } from "./list-flags.ts";
import { updateFlagRoute } from "./update-flag.ts";

/**
 * Routes on a project's flags, registered under `/projects/:projectId/flags`.
 * Registered inside the shared protected scope (see modules/index.ts), so a valid
 * session is already guaranteed and `request.accountId` is set.
 */
export const flagProtectedRoutes: FastifyPluginAsyncZod = async (app) => {
  // Authorization: the project must belong to the caller. Runs after params validation.
  // A project that exists but isn't theirs gets the same 404 as one that doesn't exist.
  app.addHook("preHandler", async (request) => {
    const { projectId } = request.params as { projectId: string };

    const project = await findProjectByIdAndAccountId(projectId, request.accountId);

    if (!project) {
      throw new NotFoundError("Project not found", { code: ErrorCode.NOT_FOUND });
    }
  });

  app.register(createFlagRoute);
  app.register(listFlagsRoute);
  app.register(getFlagRoute);
  app.register(updateFlagRoute);
  app.register(deleteFlagRoute);
};
