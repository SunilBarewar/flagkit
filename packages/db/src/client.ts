import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index.ts";

export type ConnectDatabaseOptions = {
  /** Postgres connection string. Defaults to process.env.DATABASE_URL. */
  url?: string;
  /** Max pool size. Defaults to 10. */
  max?: number;
};

export function connectDatabase(options: ConnectDatabaseOptions = {}) {
  const url = options.url ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(url, { max: options.max ?? 10 });
  const db = drizzle(client, { schema });

  return { db, client };
}

export type Database = ReturnType<typeof connectDatabase>["db"];
