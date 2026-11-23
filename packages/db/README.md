# @flagkit/db

The only place in the monorepo that talks to the database. Built on
[Drizzle ORM](https://orm.drizzle.team) and `postgres`.

## Rule

**All database access happens inside this package.** Apps and other packages
never touch the drizzle instance, the schema or raw SQL. They import small,
purpose-named helper functions instead:

```ts
import { findAccountByEmail, insertAccount } from "@flagkit/db";

const existing = await findAccountByEmail("hello@example.com");
const account = await insertAccount({ email, password: passwordHash });
```

That is why the package does **not** export `db`, `schema` or `sql`. If you
need a query that doesn't exist yet, add a helper here.

## Layout

```
src/
  index.ts        public API (what other packages can import)
  client.ts       connectDatabase(): builds the postgres pool + drizzle instance
  instance.ts     shared lazy instance (internal) and closeDatabase()
  schema/         table definitions, one file per domain (internal)
  queries/        query helpers, one file per domain, re-exported from index.ts
migrations/       generated SQL migrations
```

## Adding a query

1. Add a function to `src/queries/<domain>.ts` (create the file for a new domain).
2. Re-export it from `src/queries/index.ts`.
3. Import it from `@flagkit/db` in the app.

Guidelines for helpers:

- Take plain arguments and return plain rows or types (`Account`), never query builders.
- Keep them free of business logic (no hashing, validation or HTTP concerns).
- Let database errors propagate. The API's global error handler maps Postgres
  errors (for example a unique violation to HTTP 409).

## Changing the schema

Edit `src/schema/`, then from the repo root:

```bash
pnpm db:generate   # create a migration from the schema diff
pnpm db:migrate    # apply migrations
```

## Configuration

Uses `DATABASE_URL` from the root `.env`. The connection is created lazily on
first query, so importing the package never opens a connection. Call
`closeDatabase()` on shutdown.
