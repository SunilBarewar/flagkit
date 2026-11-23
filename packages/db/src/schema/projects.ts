import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { accounts } from "./accounts.ts";
import { id, timestamps } from "./columns.ts";

export const projects = pgTable(
  "projects",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** The 10-char public part of the API key (`fk_<apiKeyId>_<secret>`). Safe to store and display. */
    apiKeyId: text("api_key_id").notNull().unique(),
    /** HMAC-SHA256 (with a server-side pepper) of the full API key. The plaintext is never stored. */
    apiKeyHash: text("api_key_hash").notNull(),
    ...timestamps,
  },
  (table) => [index("projects_account_id_idx").on(table.accountId)],
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
