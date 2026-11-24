import { and, count, desc, eq } from "drizzle-orm";

import { db } from "../instance.ts";
import { featureFlags, type FeatureFlag, type NewFeatureFlag } from "../schema/index.ts";

export type InsertFeatureFlagInput = Pick<
  NewFeatureFlag,
  "projectId" | "key" | "description" | "type" | "isActive" | "defaultValue" | "rolloutPercentage"
>;

/**
 * Insert a new flag and return the created row.
 * Throws the Postgres unique violation (23505) if the key is taken within the project,
 * and the check violation (23514) if the rollout isn't between 0 and 100.
 */
export async function insertFeatureFlag(input: InsertFeatureFlagInput): Promise<FeatureFlag> {
  const [flag] = await db.insert(featureFlags).values(input).returning();
  return flag!;
}

/** One page of a project's flags, newest first (ids are time-ordered UUIDv7). */
export async function listFeatureFlagsByProjectId(
  projectId: string,
  { limit, offset }: { limit: number; offset: number },
): Promise<FeatureFlag[]> {
  return db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.projectId, projectId))
    .orderBy(desc(featureFlags.id))
    .limit(limit)
    .offset(offset);
}

/** Total number of flags in a project, for pagination. */
export async function countFeatureFlagsByProjectId(projectId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(featureFlags)
    .where(eq(featureFlags.projectId, projectId));
  return row!.total;
}

/** Scoped to the project, so a flag id from another project is never found. */
export async function findFeatureFlag(
  projectId: string,
  flagId: string,
): Promise<FeatureFlag | undefined> {
  const [flag] = await db
    .select()
    .from(featureFlags)
    .where(and(eq(featureFlags.projectId, projectId), eq(featureFlags.id, flagId)))
    .limit(1);
  return flag;
}

/** The key and type are fixed once a flag exists: the SDK depends on both. */
export type UpdateFeatureFlagInput = Partial<
  Pick<NewFeatureFlag, "description" | "isActive" | "defaultValue" | "rolloutPercentage">
>;

/** Returns the updated row, or undefined if the project has no such flag. */
export async function updateFeatureFlag(
  projectId: string,
  flagId: string,
  input: UpdateFeatureFlagInput,
): Promise<FeatureFlag | undefined> {
  const [flag] = await db
    .update(featureFlags)
    .set(input)
    .where(and(eq(featureFlags.projectId, projectId), eq(featureFlags.id, flagId)))
    .returning();
  return flag;
}

/** Returns true if a flag was deleted. */
export async function deleteFeatureFlag(projectId: string, flagId: string): Promise<boolean> {
  const deleted = await db
    .delete(featureFlags)
    .where(and(eq(featureFlags.projectId, projectId), eq(featureFlags.id, flagId)))
    .returning({ id: featureFlags.id });
  return deleted.length > 0;
}

/** Lookup by the key the SDK passes, scoped to the project. */
export async function findFeatureFlagByKey(
  projectId: string,
  key: string,
): Promise<FeatureFlag | undefined> {
  const [flag] = await db
    .select()
    .from(featureFlags)
    .where(and(eq(featureFlags.projectId, projectId), eq(featureFlags.key, key)))
    .limit(1);
  return flag;
}
