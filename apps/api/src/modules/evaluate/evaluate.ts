import type { FeatureFlag } from "@flagkit/db";
import type {
  ConditionOperator,
  EvaluateFlagResponse,
  EvaluationContext,
  EvaluationTrace,
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
  /** Multivariate only: serve this variant to everyone who passes the rule. */
  variantKey?: string | null;
  conditions: EvaluableCondition[];
}

export interface EvaluableVariant {
  key: string;
  rolloutPercentage: number;
  payload: unknown;
}

/**
 * Evaluates a flag for one user and returns only the answer. See `explainEvaluation`.
 */
export function evaluateFlag(
  flag: Pick<FeatureFlag, "key" | "enabled" | "type">,
  rules: EvaluableRule[],
  context: EvaluationContext,
  variants: EvaluableVariant[] = [],
): EvaluateFlagResponse {
  return explainEvaluation(flag, rules, context, variants).result;
}

type TraceRule = EvaluationTrace["rules"][number];

/**
 * Evaluates a flag for one user and also reports how it got there. Pure: no I/O, so it is
 * trivial to test.
 *
 * A disabled flag is off for everyone. Otherwise the first enabled rule the user passes decides:
 * they match all of its conditions (a rule with none matches everyone) and their bucket is inside
 * its rollout. All rules share one bucket, so a user who misses a rule's rollout can only pass a
 * later rule with a larger percentage. A user who passes no rule is off.
 *
 * A boolean flag is then simply on. A multivariate flag serves the rule's forced variant, or picks
 * one by the variants' percentages. `rules` must be in priority order and `variants` in a stable
 * order, so the same user keeps the same variant.
 */
export function explainEvaluation(
  flag: Pick<FeatureFlag, "key" | "enabled" | "type">,
  rules: EvaluableRule[],
  context: EvaluationContext,
  variants: EvaluableVariant[] = [],
): { result: EvaluateFlagResponse; trace: EvaluationTrace } {
  const bucket = getBucket(context.userId, flag.key);

  let passedIndex = -1;
  const ruleTraces: TraceRule[] = rules.map((rule, index) => {
    const conditions = rule.conditions.map((condition) => ({
      attribute: condition.attribute,
      operator: condition.operator,
      value: condition.value as TraceRule["conditions"][number]["value"],
      actual: context.properties[condition.attribute] ?? null,
      matched: matchesCondition(condition, context.properties),
    }));

    let status: TraceRule["status"];
    if (!flag.enabled || passedIndex !== -1) status = "not_reached";
    else if (!rule.enabled) status = "turned_off";
    else if (!conditions.every((condition) => condition.matched)) status = "conditions_not_matched";
    else if (bucket >= rule.rolloutPercentage) status = "missed_rollout";
    else {
      status = "passed";
      passedIndex = index;
    }

    return {
      status,
      enabled: rule.enabled,
      rolloutPercentage: rule.rolloutPercentage,
      variantKey: rule.variantKey ?? null,
      conditions,
    };
  });

  const off: EvaluateFlagResponse =
    flag.type === "multivariate"
      ? { key: flag.key, enabled: false, variant: null, payload: null }
      : { key: flag.key, enabled: false };
  const trace = (patch: Partial<EvaluationTrace>): EvaluationTrace => ({
    reason: "passed",
    bucket,
    variantBucket: null,
    variantSource: null,
    rules: ruleTraces,
    ...patch,
  });

  if (!flag.enabled) return { result: off, trace: trace({ reason: "flag_disabled" }) };

  const rule = rules[passedIndex];
  if (!rule) return { result: off, trace: trace({ reason: "no_rule_passed" }) };

  if (flag.type !== "multivariate") {
    return { result: { key: flag.key, enabled: true }, trace: trace({}) };
  }

  const forced = Boolean(rule.variantKey);
  const variantBucket = forced ? null : getVariantBucket(context.userId, flag.key);
  const variant = forced
    ? variants.find((candidate) => candidate.key === rule.variantKey)
    : pickVariant(variants, variantBucket!);
  const variantTrace = { variantBucket, variantSource: forced ? "forced" : "split" } as const;

  if (!variant) {
    return { result: off, trace: trace({ reason: "no_variant", ...variantTrace }) };
  }

  return {
    result: {
      key: flag.key,
      enabled: true,
      variant: variant.key,
      payload: variant.payload as EvaluateFlagResponse["payload"],
    },
    trace: trace(variantTrace),
  };
}

/**
 * The variant whose slice of 0-99 contains the bucket: with 50/25/25 the first covers buckets
 * 0-49, the second 50-74 and the third 75-99. Percentages that don't add up to 100 leave some
 * buckets without a variant.
 */
export function pickVariant(
  variants: EvaluableVariant[],
  bucket: number,
): EvaluableVariant | undefined {
  let upperBound = 0;

  for (const variant of variants) {
    upperBound += variant.rolloutPercentage;
    if (bucket < upperBound) return variant;
  }

  return undefined;
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

/**
 * A second stable bucket, independent of the rollout bucket. If the variant were picked from the
 * rollout bucket, the users let in by a 20% rollout would all be the ones with buckets 0-19 and so
 * would all get the first variant.
 */
export function getVariantBucket(userId: string, flagKey: string): number {
  const digest = createHash("sha256").update(`variant:${flagKey}:${userId}`).digest();

  return digest.readUInt32BE(0) % 100;
}
