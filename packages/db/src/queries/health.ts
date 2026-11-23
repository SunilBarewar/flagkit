import { sql } from "drizzle-orm";

import { db } from "../instance.ts";

/** Resolves if the database answers a trivial query, throws otherwise. */
export async function pingDatabase(): Promise<void> {
  await db.execute(sql`select 1`);
}
