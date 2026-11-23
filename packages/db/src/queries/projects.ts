import { desc, eq } from "drizzle-orm";

import { db } from "../instance.ts";
import { projects, type NewProject, type Project } from "../schema/index.ts";

/** `apiKeyHash` must already be hashed, this package never hashes anything. */
export type InsertProjectInput = Pick<NewProject, "accountId" | "name" | "apiKeyId" | "apiKeyHash">;

/**
 * Insert a new project and return the created row.
 * Throws the Postgres foreign key violation (23503) if the account doesn't exist.
 */
export async function insertProject(input: InsertProjectInput): Promise<Project> {
  const [project] = await db.insert(projects).values(input).returning();
  return project!;
}

/** All projects owned by an account, newest first. */
export async function listProjectsByAccountId(accountId: string): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(eq(projects.accountId, accountId))
    .orderBy(desc(projects.id));
}
