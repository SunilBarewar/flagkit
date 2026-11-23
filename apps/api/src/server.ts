import { closeDatabase } from "@flagkit/db";

import { buildApp } from "@/app.ts";
import { Config } from "@/env.ts";

const app = buildApp();

async function shutdown(signal: string) {
  app.log.info({ signal }, "shutting down");
  await app.close();
  await closeDatabase();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ port: Config.PORT, host: Config.HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
