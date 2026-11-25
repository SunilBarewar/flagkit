import { RuleSet } from "@flagkit/shared/schemas";
import type { ConditionOperator, ReplaceRulesInput, RuleResponse } from "@flagkit/shared/schemas";

/** A condition as edited in the form. The value is text until it is saved. */
export interface ConditionDraft {
  id: string;
  attribute: string;
  operator: ConditionOperator;
  value: string;
}

/** A rule as edited in the form. Nothing is saved until the flag is. */
export interface RuleDraft {
  id: string;
  enabled: boolean;
  rolloutPercentage: number;
  /** Multivariate only. Empty means split by the variants' percentages. */
  variantKey: string;
  conditions: ConditionDraft[];
}

export const operatorLabels: Record<ConditionOperator, string> = {
  equals: "is",
  not_equals: "is not",
  in: "is one of",
  not_in: "is not one of",
  greater_than: "is greater than",
  less_than: "is less than",
  contains: "contains",
};

export const newCondition = (patch: Partial<ConditionDraft> = {}): ConditionDraft => ({
  id: crypto.randomUUID(),
  attribute: "",
  operator: "equals",
  value: "",
  ...patch,
});

/** No conditions and 0%: what a new flag starts with, so it reaches nobody until it is edited. */
export const newRule = (patch: Partial<RuleDraft> = {}): RuleDraft => ({
  id: crypto.randomUUID(),
  enabled: true,
  rolloutPercentage: 0,
  variantKey: "",
  conditions: [],
  ...patch,
});

type Scalar = string | number | boolean;

/** `25` is a number and `true` a boolean. Wrap text in quotes ("25") to keep it as text. */
function parseScalar(text: string): Scalar {
  const trimmed = text.trim();
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "string" || typeof parsed === "number" || typeof parsed === "boolean") {
      return parsed;
    }
  } catch {
    // Not JSON: plain text.
  }
  return trimmed;
}

/** The inverse of parseScalar: quote text that would otherwise be read as a number or boolean. */
function formatScalar(value: unknown): string {
  if (typeof value === "string") {
    return parseScalar(value) === value.trim() && value === value.trim()
      ? value
      : JSON.stringify(value);
  }
  return String(value);
}

export const toRuleDrafts = (rules: RuleResponse[]): RuleDraft[] =>
  rules.map((rule) =>
    newRule({
      id: rule.id,
      enabled: rule.enabled,
      rolloutPercentage: rule.rolloutPercentage,
      variantKey: rule.variantKey ?? "",
      conditions: rule.conditions.map((condition) =>
        newCondition({
          id: condition.id,
          attribute: condition.attribute,
          operator: condition.operator,
          value: Array.isArray(condition.value)
            ? condition.value.map(formatScalar).join(", ")
            : formatScalar(condition.value),
        }),
      ),
    }),
  );

interface RuleContext {
  multivariate: boolean;
  /** The keys of the variants the flag will have when it is saved. */
  variantKeys: string[];
}

/** The drafts as the API expects them, or the first problem found. */
export function toRuleInputs(
  drafts: RuleDraft[],
  { multivariate, variantKeys }: RuleContext,
): { rules: ReplaceRulesInput["rules"] } | { error: string } {
  const rules = [];

  for (const [i, draft] of drafts.entries()) {
    const label = `Set ${i + 1}`;
    const conditions = [];

    for (const condition of draft.conditions) {
      const { attribute, operator } = condition;
      const text = condition.value.trim();
      let value: unknown;

      if (operator === "in" || operator === "not_in") {
        value = text
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .map(parseScalar);
      } else if (operator === "greater_than" || operator === "less_than") {
        value = text === "" ? Number.NaN : Number(text);
        if (Number.isNaN(value)) {
          return { error: `${label}: "${attribute.trim()}" needs a number` };
        }
      } else if (operator === "contains") {
        value = text;
      } else {
        value = parseScalar(text);
      }

      conditions.push({ attribute: attribute.trim(), operator, value });
    }

    if (multivariate && draft.variantKey && !variantKeys.includes(draft.variantKey)) {
      return { error: `${label}: the variant "${draft.variantKey}" no longer exists` };
    }

    rules.push({
      enabled: draft.enabled,
      rolloutPercentage: draft.rolloutPercentage,
      variantKey: multivariate && draft.variantKey ? draft.variantKey : undefined,
      conditions,
    });
  }

  const parsed = RuleSet.safeParse(rules);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const index = issue?.path[0];
    const prefix = typeof index === "number" ? `Set ${index + 1}: ` : "";
    return { error: `${prefix}${issue?.message ?? "Check the release conditions"}` };
  }

  return { rules: rules as ReplaceRulesInput["rules"] };
}

/** "all users", or "users where country is IN and plan is premium". */
export function describeAudience(rule: RuleDraft): string {
  if (rule.conditions.length === 0) return "all users";

  const parts = rule.conditions.map(
    (condition) =>
      `${condition.attribute.trim() || "…"} ${operatorLabels[condition.operator]} ${condition.value.trim() || "…"}`,
  );
  return `users where ${parts.join(" and ")}`;
}
