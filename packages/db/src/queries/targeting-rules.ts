import { eq } from "drizzle-orm";

import { db } from "../instance.ts";
import { targetingRules } from "../schema/index.ts";
import { insertRules, selectRules } from "./rules-internal.ts";
import type { RuleInput, RuleWithConditions } from "./rules-internal.ts";

export type { RuleConditionInput, RuleInput, RuleWithConditions } from "./rules-internal.ts";

/** A flag's rules in priority order, each with its conditions. */
export async function listRulesWithConditions(flagId: string): Promise<RuleWithConditions[]> {
  return selectRules(db, flagId);
}

/**
 * Make the flag's rules exactly `rules`, in one transaction. Priority is the position in the
 * list, so the first rule is tried first. Rules are recreated, so their ids change.
 */
export async function replaceFlagRules(
  flagId: string,
  rules: RuleInput[],
): Promise<RuleWithConditions[]> {
  return db.transaction(async (tx) => {
    await tx.delete(targetingRules).where(eq(targetingRules.flagId, flagId));
    return insertRules(tx, flagId, rules);
  });
}
