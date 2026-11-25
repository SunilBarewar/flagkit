import { asc, eq, inArray } from "drizzle-orm";

import type { Database } from "../client.ts";
import {
  flagVariants,
  ruleConditions,
  targetingRules,
  type NewRuleCondition,
  type RuleCondition,
  type TargetingRule,
} from "../schema/index.ts";

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type RuleConditionInput = Pick<NewRuleCondition, "attribute" | "operator" | "value">;

export interface RuleInput {
  enabled: boolean;
  rolloutPercentage: number;
  /** The key of one of the flag's variants. */
  variantKey?: string;
  conditions: RuleConditionInput[];
}

export type RuleWithConditions = TargetingRule & {
  variantKey: string | null;
  conditions: RuleCondition[];
};

/** Shared by flag creation and rule replacement. Priority is the position in `rules`, from 1. */
export async function insertRules(
  tx: Tx,
  flagId: string,
  rules: RuleInput[],
): Promise<RuleWithConditions[]> {
  const variants = await tx.select().from(flagVariants).where(eq(flagVariants.flagId, flagId));
  const variantByKey = new Map(variants.map((variant) => [variant.key, variant]));

  const inserted = await tx
    .insert(targetingRules)
    .values(
      rules.map((rule, index) => ({
        flagId,
        priority: index + 1,
        enabled: rule.enabled,
        rolloutPercentage: rule.rolloutPercentage,
        variantId: rule.variantKey ? variantByKey.get(rule.variantKey)?.id : undefined,
      })),
    )
    .returning();
  const ruleByPriority = new Map(inserted.map((rule) => [rule.priority, rule]));

  const conditions = rules.flatMap((rule, index) =>
    rule.conditions.map((condition) => ({
      ...condition,
      ruleId: ruleByPriority.get(index + 1)!.id,
    })),
  );
  const insertedConditions =
    conditions.length > 0 ? await tx.insert(ruleConditions).values(conditions).returning() : [];

  return withConditions(inserted, insertedConditions, variants);
}

export async function selectRules(
  db: Database | Tx,
  flagId: string,
): Promise<RuleWithConditions[]> {
  const rules = await db
    .select()
    .from(targetingRules)
    .where(eq(targetingRules.flagId, flagId))
    .orderBy(asc(targetingRules.priority));
  if (rules.length === 0) return [];

  const [conditions, variants] = await Promise.all([
    db
      .select()
      .from(ruleConditions)
      .where(
        inArray(
          ruleConditions.ruleId,
          rules.map((rule) => rule.id),
        ),
      )
      .orderBy(asc(ruleConditions.id)),
    db.select().from(flagVariants).where(eq(flagVariants.flagId, flagId)),
  ]);

  return withConditions(rules, conditions, variants);
}

function withConditions(
  rules: TargetingRule[],
  conditions: RuleCondition[],
  variants: { id: string; key: string }[],
): RuleWithConditions[] {
  const keyById = new Map(variants.map((variant) => [variant.id, variant.key]));

  return [...rules]
    .sort((a, b) => a.priority - b.priority)
    .map((rule) => ({
      ...rule,
      variantKey: (rule.variantId && keyById.get(rule.variantId)) || null,
      conditions: conditions.filter((condition) => condition.ruleId === rule.id),
    }));
}
