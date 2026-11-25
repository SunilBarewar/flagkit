// Public API of @flagkit/db.
//
// `db`, the drizzle `schema` and raw SQL helpers are intentionally NOT exported:
// every database call lives in ./queries and other packages use those helpers.
export { closeDatabase } from "./instance.ts";
export { connectDatabase } from "./client.ts";
export type { ConnectDatabaseOptions, Database } from "./client.ts";
export * from "./queries/index.ts";
export type {
  Account,
  FeatureFlag,
  FlagVariant,
  NewAccount,
  NewFeatureFlag,
  NewFlagVariant,
  NewProject,
  Project,
} from "./schema/index.ts";
