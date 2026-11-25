import { and, count, desc, eq } from "drizzle-orm";

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

/** Scoped to the owner, so another account's project id is never found. */
export async function findProjectByIdAndAccountId(
  id: string,
  accountId: string,
): Promise<Project | undefined> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.accountId, accountId)))
    .limit(1);
  return project;
}

/**
 * Swap in a new key. The old one stops working immediately because lookups use `apiKeyId`.
 * Scoped to the owner, returns undefined if the project isn't theirs.
 */
export async function replaceProjectApiKey(
  id: string,
  accountId: string,
  key: Pick<NewProject, "apiKeyId" | "apiKeyHash">,
): Promise<Project | undefined> {
  const [project] = await db
    .update(projects)
    .set(key)
    .where(and(eq(projects.id, id), eq(projects.accountId, accountId)))
    .returning();
  return project;
}

/** Look a project up by the public part of its API key. */
export async function findProjectByApiKeyId(apiKeyId: string): Promise<Project | undefined> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.apiKeyId, apiKeyId))
    .limit(1);
  return project;
}

/** One page of an account's projects, newest first (ids are time-ordered UUIDv7). */
export async function listProjectsByAccountId(
  accountId: string,
  { limit, offset }: { limit: number; offset: number },
): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(eq(projects.accountId, accountId))
    .orderBy(desc(projects.id))
    .limit(limit)
    .offset(offset);
}

/** Total number of projects an account owns, for pagination. */
export async function countProjectsByAccountId(accountId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(projects)
    .where(eq(projects.accountId, accountId));
  return row!.total;
}
