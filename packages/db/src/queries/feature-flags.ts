import { and, count, desc, eq } from "drizzle-orm";

import { db } from "../instance.ts";
import {
  featureFlags,
  flagVariants,
  type FeatureFlag,
  type FlagVariant,
  type NewFeatureFlag,
} from "../schema/index.ts";
import type { FlagVariantInput } from "./flag-variants.ts";
import { insertRules } from "./rules-internal.ts";
import type { RuleInput, RuleWithConditions } from "./rules-internal.ts";

export type InsertFeatureFlagInput = Pick<
  NewFeatureFlag,
  "projectId" | "key" | "description" | "type" | "enabled"
>;

/**
 * Insert a new boolean flag together with its rules and return both.
 * Throws the Postgres unique violation (23505) if the key is taken within the project.
 */
export async function insertFeatureFlag(
  input: Omit<InsertFeatureFlagInput, "type">,
  rules: RuleInput[],
): Promise<{ flag: FeatureFlag; rules: RuleWithConditions[] }> {
  return db.transaction(async (tx) => {
    const [flag] = await tx
      .insert(featureFlags)
      .values({ ...input, type: "boolean" })
      .returning();
    return { flag: flag!, rules: await insertRules(tx, flag!.id, rules) };
  });
}

/**
 * Insert a multivariate flag with its variants and rules in one transaction, so a flag never
 * exists without them. Rules refer to variants by key. Throws the same Postgres errors as
 * `insertFeatureFlag`.
 */
export async function insertMultivariateFeatureFlag(
  input: Omit<InsertFeatureFlagInput, "type">,
  variants: FlagVariantInput[],
  rules: RuleInput[],
): Promise<{ flag: FeatureFlag; variants: FlagVariant[]; rules: RuleWithConditions[] }> {
  return db.transaction(async (tx) => {
    const [flag] = await tx
      .insert(featureFlags)
      .values({ ...input, type: "multivariate" })
      .returning();
    const rows = await tx
      .insert(flagVariants)
      .values(variants.map((variant) => ({ ...variant, flagId: flag!.id })))
      .returning();
    return { flag: flag!, variants: rows, rules: await insertRules(tx, flag!.id, rules) };
  });
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
export type UpdateFeatureFlagInput = Partial<Pick<NewFeatureFlag, "description" | "enabled">>;

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
