import { boolean, check, integer, pgEnum, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { id, timestamps } from "./columns.ts";
import { projects } from "./projects.ts";

export const flagTypeEnum = pgEnum("flag_type", ["boolean", "multivariate"]);

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: id(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    description: text("description"),
    type: flagTypeEnum("type").notNull(),
    /** Global kill switch: when false the flag is off for everyone, whatever else is set. */
    enabled: boolean("enabled").notNull().default(false),
    /**
     * Percentage (0-100) of users who get `true` when the flag is enabled and no targeting rule
     * decides for them. With no rules at all, that is every user: 100 means everyone.
     */
    rolloutPercentage: integer("rollout_percentage").notNull().default(100),
    ...timestamps,
  },
  (table) => [
    // Also serves lookups by project_id alone, so no separate index is needed.
    unique("feature_flags_project_id_key_unique").on(table.projectId, table.key),
    check(
      "feature_flags_rollout_percentage_range",
      sql`${table.rolloutPercentage} BETWEEN 0 AND 100`,
    ),
  ],
);

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;
