import { and, asc, eq, notInArray, sql } from "drizzle-orm";

import { db } from "../instance.ts";
import { flagVariants, type FlagVariant, type NewFlagVariant } from "../schema/index.ts";

export type FlagVariantInput = Pick<
  NewFlagVariant,
  "key" | "description" | "payload" | "rolloutPercentage"
>;

/** A flag's variants in creation order (ids are time-ordered UUIDv7). */
export async function listFlagVariants(flagId: string): Promise<FlagVariant[]> {
  return db
    .select()
    .from(flagVariants)
    .where(eq(flagVariants.flagId, flagId))
    .orderBy(asc(flagVariants.id));
}

/**
 * Make the flag's variants exactly `variants`, in one transaction. Variants are matched by key:
 * existing ones are updated (keeping their id), new ones are inserted, and the rest are deleted.
 */
export async function replaceFlagVariants(
  flagId: string,
  variants: FlagVariantInput[],
): Promise<FlagVariant[]> {
  return db.transaction(async (tx) => {
    await tx
      .insert(flagVariants)
      .values(variants.map((variant) => ({ ...variant, flagId })))
      .onConflictDoUpdate({
        target: [flagVariants.flagId, flagVariants.key],
        set: {
          description: sql`excluded.description`,
          payload: sql`excluded.payload`,
          rolloutPercentage: sql`excluded.rollout_percentage`,
        },
      });

    await tx.delete(flagVariants).where(
      and(
        eq(flagVariants.flagId, flagId),
        notInArray(
          flagVariants.key,
          variants.map((variant) => variant.key),
        ),
      ),
    );

    return tx
      .select()
      .from(flagVariants)
      .where(eq(flagVariants.flagId, flagId))
      .orderBy(asc(flagVariants.id));
  });
}
