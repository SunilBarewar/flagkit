import { boolean, check, integer, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { id } from "./columns.ts";
import { featureFlags } from "./feature-flags.ts";
import { flagVariants } from "./flag-variants.ts";

export const targetingRules = pgTable(
  "targeting_rules",
  {
    id: id(),
    flagId: uuid("flag_id")
      .notNull()
      .references(() => featureFlags.id, { onDelete: "cascade" }),
    /** Lower runs first. */
    priority: integer("priority").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    /** Share (0-100) of the users matching this rule who pass it. */
    rolloutPercentage: integer("rollout_percentage").notNull().default(0),
    /** Multivariate only: serve this variant instead of splitting by the variants' percentages. */
    variantId: uuid("variant_id").references(() => flagVariants.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("targeting_rules_flag_id_priority_unique").on(table.flagId, table.priority),
    check(
      "targeting_rules_rollout_percentage_range",
      sql`${table.rolloutPercentage} BETWEEN 0 AND 100`,
    ),
  ],
);

export type TargetingRule = typeof targetingRules.$inferSelect;
export type NewTargetingRule = typeof targetingRules.$inferInsert;
