# Flagkit

Flagkit is a **production-grade feature flag platform**. Teams manage flags in a web dashboard, and apps call the API at runtime to check whether a flag is on for a user.

Built in **TypeScript** as a **pnpm monorepo** with **Fastify**, **PostgreSQL**, **Redis** and **React**.

- **API:** typed REST API with **Zod** validation and auto-generated **OpenAPI** docs.
- **Security:** **JWT** sessions in **HttpOnly cookies**, **bcrypt** passwords, **HMAC-hashed** API keys that can be rotated, and **timing-safe** checks.
- **Performance:** **two-level cache** (in-memory **LRU** + **Redis**), **request coalescing**, cache clearing across servers with **Redis pub/sub**, and **load testing**.
- **Evaluation engine:** **hash-based bucketing** for consistent rollouts, attribute targeting and **A/B/n variant splits**.
- **Data:** **PostgreSQL** with **Drizzle ORM**, **SQL migrations** and **Docker Compose**.
- **Frontend:** **React 19**, **Vite**, **TanStack Query** and **Tailwind / shadcn/ui**.
- **Tooling:** **Vitest**, **oxlint**, **oxfmt**, pre-commit hooks and [design docs](docs/).

## Features

- **Boolean flags**: on or off for a user.
- **Multivariate flags**: serve one of 2 to 20 variants (for example `control`, `blue`, `green`), each with an optional JSON payload. Variant splits are set in percentages that add up to 100.
- **Targeting rules**: match users on their properties with `equals`, `not_equals`, `in`, `not_in`, `greater_than`, `less_than` and `contains`. Rules run in priority order and the first one a user passes wins.
- **Percentage rollouts**: each rule can release to a share (0–100%) of the users it matches.
- **Deterministic bucketing**: a user's bucket is a hash of the flag key and user ID, so the same user always gets the same result, and their bucket for one flag says nothing about another.
- **Forced variants**: a rule on a multivariate flag can pin matching users to a specific variant instead of splitting them.
- **Flag testing**: evaluate a saved flag for any user from the dashboard and see exactly why it returned what it did (buckets, and the outcome of every rule and condition).
- **Projects and API keys**: each project has its own flags and its own API key. Keys are shown once, stored only as an HMAC, and can be rotated at any time.
- **Fast evaluation**: flag configs and API keys are cached in memory and in Redis, with request coalescing and cross-server invalidation over Redis pub/sub.
- **API docs**: an OpenAPI spec is generated from the route schemas and served at `/docs`.

## Tech stack

| Area      | Tools                                                                              |
| --------- | ---------------------------------------------------------------------------------- |
| API       | Node.js 20+, TypeScript, Fastify 5, Zod 4 (validation, serialization, OpenAPI)     |
| Auth      | JWT in an HttpOnly session cookie (`jose`), bcrypt passwords, HMAC API keys        |
| Database  | PostgreSQL 17, Drizzle ORM and Drizzle Kit migrations                              |
| Cache     | Redis 7 (`ioredis`), in-process LRU, request coalescing, pub/sub invalidation      |
| Dashboard | React 19, Vite, React Router, TanStack Query, React Hook Form, Tailwind, shadcn/ui |
| API docs  | `@fastify/swagger` + Scalar                                                        |
| Tooling   | pnpm workspaces, Vitest, oxlint, oxfmt, simple-git-hooks + lint-staged, autocannon |

## Project structure

```
apps/
  api/        Fastify REST API (accounts, projects, flags, rules, variants, evaluate)
  web/        React dashboard
packages/
  db/         Drizzle schema, migrations and queries
  shared/     Zod schemas, error codes and constants shared by the API and the dashboard
docs/         Design notes: evaluation engine, caching, API keys, database schema
```

## Getting started

Prerequisites: Node.js 20+, pnpm 10+ and Docker.

```bash
# 1. Install dependencies
pnpm install

# 2. Create the environment file and set JWT_SECRET and API_KEY_PEPPER
#    (generate each with: openssl rand -hex 32)
cp .env.example .env
cp apps/web/.env.example apps/web/.env

# 3. Start Postgres (localhost:5433) and Redis (localhost:6380)
docker compose up -d

# 4. Run the database migrations
pnpm db:migrate

# 5. Start the API (http://localhost:8000) and the dashboard (http://localhost:5173)
pnpm dev:api
pnpm dev:web
```

Interactive API docs are at <http://localhost:8000/docs>.

## Common commands

| Command            | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| `pnpm dev:api`     | Run the API with hot reload                               |
| `pnpm dev:web`     | Run the dashboard with Vite                               |
| `pnpm build`       | Build every package                                       |
| `pnpm typecheck`   | Type-check every package                                  |
| `pnpm test`        | Run the tests with Vitest (`test:watch`, `test:coverage`) |
| `pnpm lint`        | Lint with oxlint (`lint:fix` to apply fixes)              |
| `pnpm format`      | Format with oxfmt (`format:check` to only check)          |
| `pnpm db:generate` | Generate a migration from schema changes                  |
| `pnpm db:migrate`  | Apply pending migrations                                  |
| `pnpm db:studio`   | Open Drizzle Studio to browse the database                |
| `pnpm load-test`   | Load-test the evaluate endpoint (see below)               |

## Using the API with curl

The API has two kinds of authentication:

- **Session cookie** for managing accounts, projects and flags. Log in once and curl stores the cookie in `cookies.txt` (`-c` saves it, `-b` sends it).
- **Project API key** (`x-api-key` header) for evaluating flags from your app.

Every response uses the same envelope: `{ "message", "data" }` on success, `{ "message", "data", "pagination" }` for lists, and `{ "message", "error": { "code", "details" } }` on errors.

The examples below use these shell variables:

```bash
API=http://localhost:8000
PROJECT_ID=<project id>
FLAG_ID=<flag id>
API_KEY=<fk_... key returned when the project was created or its key rotated>
```

### Health

```bash
curl $API/health
curl $API/health/db
```

### Accounts

```bash
# Sign up (also logs you in and creates a "Default project")
curl -c cookies.txt -X POST $API/accounts \
  -H 'Content-Type: application/json' \
  -d '{"email": "you@example.com", "password": "supersecret"}'

# Log in
curl -c cookies.txt -X POST $API/accounts/login \
  -H 'Content-Type: application/json' \
  -d '{"email": "you@example.com", "password": "supersecret"}'

# Who am I
curl -b cookies.txt $API/accounts/me

# Update your email and/or password (ACCOUNT_ID is the id from /accounts/me)
curl -b cookies.txt -X PATCH $API/accounts/$ACCOUNT_ID \
  -H 'Content-Type: application/json' \
  -d '{"password": "an-even-better-secret"}'

# Log out
curl -b cookies.txt -c cookies.txt -X POST $API/accounts/logout

# Delete your account
curl -b cookies.txt -X DELETE $API/accounts/$ACCOUNT_ID
```

### Projects

```bash
# Create a project. The API key is in the response and is only shown this once.
curl -b cookies.txt -X POST $API/projects \
  -H 'Content-Type: application/json' \
  -d '{"name": "My app"}'

# List your projects (paginated: page defaults to 1, limit to 20, max 100)
curl -b cookies.txt "$API/projects?page=1&limit=20"

# Rotate a project's API key. The old key stops working immediately.
curl -b cookies.txt -X POST $API/projects/$PROJECT_ID/api-key/rotate
```

### Flags

Flag keys use lowercase letters, numbers, `_` and `-`. New flags start disabled, and without `rules` they get a single rule at 0%, so they reach nobody until you change them.

```bash
# Create a boolean flag, on for 25% of premium users in India
curl -b cookies.txt -X POST $API/projects/$PROJECT_ID/flags \
  -H 'Content-Type: application/json' \
  -d '{
    "key": "new_checkout",
    "type": "boolean",
    "description": "The redesigned checkout",
    "enabled": true,
    "rules": [
      {
        "rolloutPercentage": 25,
        "conditions": [
          { "attribute": "country", "operator": "equals", "value": "IN" },
          { "attribute": "plan", "operator": "in", "value": ["premium", "pro"] }
        ]
      }
    ]
  }'

# Create a multivariate flag with three variants, served to everyone
curl -b cookies.txt -X POST $API/projects/$PROJECT_ID/flags \
  -H 'Content-Type: application/json' \
  -d '{
    "key": "button_color",
    "type": "multivariate",
    "enabled": true,
    "variants": [
      { "key": "control", "rolloutPercentage": 50, "payload": { "color": "gray" } },
      { "key": "blue", "rolloutPercentage": 25, "payload": { "color": "#2563eb" } },
      { "key": "green", "rolloutPercentage": 25, "payload": { "color": "#16a34a" } }
    ],
    "rules": [{ "rolloutPercentage": 100 }]
  }'

# List a project's flags
curl -b cookies.txt "$API/projects/$PROJECT_ID/flags?page=1&limit=20"

# Get one flag, with its rules and variants
curl -b cookies.txt $API/projects/$PROJECT_ID/flags/$FLAG_ID

# Turn a flag on or off, or change its description (key and type can't change)
curl -b cookies.txt -X PATCH $API/projects/$PROJECT_ID/flags/$FLAG_ID \
  -H 'Content-Type: application/json' \
  -d '{"enabled": false}'

# Delete a flag
curl -b cookies.txt -X DELETE $API/projects/$PROJECT_ID/flags/$FLAG_ID
```

### Targeting rules

Saving rules replaces the whole list. Order is priority: the first rule a user passes wins. A rule with no conditions matches everyone.

```bash
# List a flag's rules
curl -b cookies.txt $API/projects/$PROJECT_ID/flags/$FLAG_ID/rules

# Replace them: internal testers always get it, then 10% of everyone else
curl -b cookies.txt -X PUT $API/projects/$PROJECT_ID/flags/$FLAG_ID/rules \
  -H 'Content-Type: application/json' \
  -d '{
    "rules": [
      {
        "rolloutPercentage": 100,
        "conditions": [{ "attribute": "email", "operator": "contains", "value": "@mycompany.com" }]
      },
      { "rolloutPercentage": 10 }
    ]
  }'

# On a multivariate flag, a rule can force a variant for the users it passes
curl -b cookies.txt -X PUT $API/projects/$PROJECT_ID/flags/$FLAG_ID/rules \
  -H 'Content-Type: application/json' \
  -d '{
    "rules": [
      {
        "rolloutPercentage": 100,
        "variantKey": "green",
        "conditions": [{ "attribute": "age", "operator": "greater_than", "value": 30 }]
      },
      { "rolloutPercentage": 100 }
    ]
  }'
```

### Variants (multivariate flags)

Saving variants replaces the whole set, matched by key: existing ones are updated, new ones created and missing ones deleted. Percentages must add up to 100.

```bash
# List a flag's variants
curl -b cookies.txt $API/projects/$PROJECT_ID/flags/$FLAG_ID/variants

# Replace them
curl -b cookies.txt -X PUT $API/projects/$PROJECT_ID/flags/$FLAG_ID/variants \
  -H 'Content-Type: application/json' \
  -d '{
    "variants": [
      { "key": "control", "rolloutPercentage": 34 },
      { "key": "blue", "rolloutPercentage": 33, "payload": { "color": "#2563eb" } },
      { "key": "green", "rolloutPercentage": 33, "payload": { "color": "#16a34a" } }
    ]
  }'
```

### Test a flag (dashboard)

Evaluates a saved flag with your session instead of an API key, and also returns a trace of how the result was reached.

```bash
curl -b cookies.txt -X POST $API/projects/$PROJECT_ID/flags/$FLAG_ID/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"userId": "user_123", "properties": {"country": "IN", "plan": "premium"}}'
```

### Evaluate a flag (from your app)

This is the endpoint your app calls. It uses the project API key and looks the flag up by its key. `userId` decides the user's rollout bucket and `properties` are matched against the targeting rules.

```bash
curl -X POST $API/evaluate/new_checkout \
  -H "x-api-key: $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"userId": "user_123", "properties": {"country": "IN", "plan": "premium"}}'
```

A boolean flag returns:

```json
{ "message": "Flag evaluated", "data": { "key": "new_checkout", "enabled": true } }
```

A multivariate flag also returns the chosen variant and its payload (both `null` when the flag is off for the user):

```json
{
  "message": "Flag evaluated",
  "data": {
    "key": "button_color",
    "enabled": true,
    "variant": "blue",
    "payload": { "color": "#2563eb" }
  }
}
```

## Load testing

`pnpm load-test` runs autocannon against `POST /evaluate/:flagKey`, spreading requests across many user IDs so the rollout hashing runs for real. Point it at a local or staging server, never production.

```bash
API_KEY=fk_... FLAG_KEY=new_checkout pnpm load-test

# Optional: API_URL, CONNECTIONS, DURATION (seconds), PIPELINING, USERS, RATE (requests/second)
API_KEY=fk_... FLAG_KEY=new_checkout DURATION=30 CONNECTIONS=50 pnpm load-test
```

## Further reading

- [Feature flag types and concepts](docs/feature-flags-types-and-concepts.md)
- [Evaluation engine](docs/evaluation-engine.md): bucketing, rules and variant selection
- [Flag config caching](docs/flag-config-caching.md)
- [API key verification](docs/api-key-verification.md)
- [Database schema guide](docs/database-schema-guide.md)
