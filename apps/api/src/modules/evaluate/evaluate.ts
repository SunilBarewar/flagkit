import type { FeatureFlag } from "@flagkit/db";
import type {
  ConditionOperator,
  EvaluateFlagResponse,
  EvaluationContext,
} from "@flagkit/shared/schemas";
import { createHash } from "node:crypto";

export interface EvaluableCondition {
  attribute: string;
  operator: ConditionOperator;
  value: unknown;
}

export interface EvaluableRule {
  enabled: boolean;
  rolloutPercentage: number;
  conditions: EvaluableCondition[];
}

/**
 * Evaluates a boolean flag for one user. Pure: no I/O, so it is trivial to test.
 *
 * A disabled flag is off for everyone. Otherwise the user is on if they pass any enabled rule:
 * they match all of its conditions (a rule with none matches everyone) and their bucket is inside
 * its rollout. All rules share one bucket, so a user who misses a rule's rollout can only pass a
 * later rule with a larger percentage. A user who passes no rule is off.
 */
export function evaluateFlag(
  flag: Pick<FeatureFlag, "key" | "enabled">,
  rules: EvaluableRule[],
  context: EvaluationContext,
): EvaluateFlagResponse {
  if (!flag.enabled) return { key: flag.key, enabled: false };

  const bucket = getBucket(context.userId, flag.key);
  const enabled = rules.some(
    (rule) =>
      rule.enabled &&
      bucket < rule.rolloutPercentage &&
      rule.conditions.every((condition) => matchesCondition(condition, context.properties)),
  );

  return { key: flag.key, enabled };
}

/**
 * Whether a user property satisfies a condition. A property the user doesn't have, or one of
 * the wrong type for the operator, never matches, even for `not_equals` and `not_in`: a rule
 * shouldn't match on data it can't see.
 */
export function matchesCondition(
  condition: EvaluableCondition,
  properties: EvaluationContext["properties"],
): boolean {
  const actual = properties[condition.attribute];
  if (actual === undefined) return false;

  const { operator, value } = condition;

  switch (operator) {
    case "equals":
      return actual === value;
    case "not_equals":
      return actual !== value;
    case "in":
      return Array.isArray(value) && value.includes(actual);
    case "not_in":
      return Array.isArray(value) && !value.includes(actual);
    case "greater_than":
      return typeof actual === "number" && typeof value === "number" && actual > value;
    case "less_than":
      return typeof actual === "number" && typeof value === "number" && actual < value;
    case "contains":
      return typeof actual === "string" && typeof value === "string" && actual.includes(value);
  }
}

/**
 * A stable bucket from 0 to 99 for this user and flag: the same inputs always give the same
 * bucket, so a user keeps their result, and raising the rollout only ever adds users.
 * The flag key is part of the hash so one flag's rollout doesn't pick the same users as another's.
 */
export function getBucket(userId: string, flagKey: string): number {
  const digest = createHash("sha256").update(`${flagKey}:${userId}`).digest();

  return digest.readUInt32BE(0) % 100;
}
