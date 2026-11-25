import { check, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { id } from "./columns.ts";
import { featureFlags } from "./feature-flags.ts";

export const flagVariants = pgTable(
  "flag_variants",
  {
    id: id(),
    flagId: uuid("flag_id")
      .notNull()
      .references(() => featureFlags.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    description: text("description"),
    payload: jsonb("payload"),
    /** A flag's variants must sum to 100. A new variant gets no traffic until it is set. */
    rolloutPercentage: integer("rollout_percentage").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("flag_variants_flag_id_key_unique").on(table.flagId, table.key),
    check(
      "flag_variants_rollout_percentage_range",
      sql`${table.rolloutPercentage} BETWEEN 0 AND 100`,
    ),
  ],
);

export type FlagVariant = typeof flagVariants.$inferSelect;
export type NewFlagVariant = typeof flagVariants.$inferInsert;
