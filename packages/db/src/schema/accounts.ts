import { pgTable, text } from "drizzle-orm/pg-core";

import { id, timestamps } from "./columns.ts";

export const accounts = pgTable("accounts", {
  id: id(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  ...timestamps,
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
