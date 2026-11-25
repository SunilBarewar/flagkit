import { index, jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { id } from "./columns.ts";
import { targetingRules } from "./targeting-rules.ts";

export const conditionOperatorEnum = pgEnum("condition_operator", [
  "equals",
  "not_equals",
  "in",
  "not_in",
  "greater_than",
  "less_than",
  "contains",
]);

export const ruleConditions = pgTable(
  "rule_conditions",
  {
    id: id(),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => targetingRules.id, { onDelete: "cascade" }),
    /** The user property to inspect. */
    attribute: text("attribute").notNull(),
    operator: conditionOperatorEnum("operator").notNull(),
    value: jsonb("value").notNull(),
  },
  (table) => [index("rule_conditions_rule_id_idx").on(table.ruleId)],
);

export type RuleCondition = typeof ruleConditions.$inferSelect;
export type NewRuleCondition = typeof ruleConditions.$inferInsert;
