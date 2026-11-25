# Feature Flag System --- Database Schema Guide

## 1. Purpose of this document

This document explains the V1 database schema for the Feature Flag
System:

- What each table represents.
- Why the table exists.
- How it relates to the other tables.
- What data it stores.
- How the evaluation engine uses that data.
- How the tables work together in common use cases.

The goal is to make the data model understandable before implementation.

## 2. Scope and design decisions

The V1 design deliberately keeps the system small:

- A project contains feature flags.
- There is no flag-level rollout setting. A flag's rollout lives in its
  targeting rules. Every flag always has at least one rule: one with no
  conditions and a 0% rollout is created together with the flag, so a new
  flag reaches nobody until that rule is edited.
- The system supports Boolean and multivariate flags.
- Targeting rules match user properties supplied by the customer's
  application.
- Percentage rollouts and variant assignments use deterministic
  hashing. Individual user assignments do not need to be stored in the
  database for the initial implementation.
- Conditions inside one rule are combined with AND. Multiple rules
  provide alternative matching paths (effectively OR). A rule with no
  conditions matches every user.
- Rules are tried in priority order. A user passes a rule when the user
  matches its conditions and falls inside its rollout percentage. The
  first rule a user passes wins. A user who misses a rule's rollout falls
  through to the next rule. All rules share one hash bucket per user and
  flag.
- The split between variants of a multivariate flag is stored on the
  variants (`flag_variants.rollout_percentage`) and applies to every user
  who passes a rule. A rule can optionally force one variant instead.
- If a user passes no rule, the flag returns the disabled result.

The five tables are:

1.  `projects`
2.  `feature_flags`
3.  `flag_variants`
4.  `targeting_rules`
5.  `rule_conditions`

## 3. First understand the main concepts

### Project

A project represents the application that uses the feature flag service.
For example, a company might create a project named `E-commerce`.

### Feature flag

A feature flag represents a feature or experiment that the application
wants to control. Examples include `new_checkout`, `dark_mode`, and
`homepage_experiment`.

The flag has a type:

- `boolean`: evaluation returns enabled or disabled.
- `multivariate`: evaluation selects one variant, such as `control`,
  `blue`, or `green`.

### User context

When an application evaluates a flag, it sends the identity and
properties of the current user. For example:

```json
{
  "userId": "user_123",
  "properties": {
    "country": "IN",
    "plan": "premium"
  }
}
```

The feature flag service does not need a copy of the customer's user
database. It evaluates the supplied context against the rules saved for
the flag.

### Targeting rule

A targeting rule describes an audience and how much of it receives the
feature. For example:

> If country is IN and plan is premium, enable the feature for 30% of
> matching users.

A rule has:

- Zero or more conditions that describe the audience. A rule with no
  conditions matches every user.
- A rollout percentage: the share of matching users who pass the rule.
- Optionally, a forced variant (multivariate flags only).
- A priority, which orders the rules, and an enabled switch.

### The default rule

Every flag is created with one rule that has no conditions and a rollout
of 0%. It matches every user, so its rollout percentage is the flag's
simple rollout: raising it to 100% turns the flag on for everybody.

Because it starts at 0%, a new flag reaches nobody until someone edits
the rule. A flag always keeps at least one rule.

### Passing a rule

A user passes a rule when both are true:

1.  The user matches every condition of the rule.
2.  The user's bucket (a stable hash of the user ID and the flag key)
    is below the rule's rollout percentage.

The first rule the user passes decides the result. A user who misses a
rule's rollout is not stopped there: they fall through to the next rule.
A user who passes no rule gets the disabled result.

---

## 4. Table 1 --- `projects`

### What does this table represent?

`projects` stores the applications or products that use the feature flag
service.

For example, a customer may create a project named `E-commerce`. All
feature flags for that application belong to this project.

### Why do we need it?

A feature flag service may serve multiple applications or customers.
Projects provide a way to group flags and keep each application's flags
separate.

Without a project relationship, it would be difficult to know which
application owns a flag or to scope flag keys to the correct
application.

### Suggested columns

| Column         | Type      | Purpose                                       |
| -------------- | --------- | --------------------------------------------- |
| `id`           | UUID      | Primary key                                   |
| `account_id`   | UUID      | References `accounts.id` (the owner)          |
| `name`         | VARCHAR   | Human-readable project name                   |
| `api_key_id`   | VARCHAR   | 10-char public part of the API key, unique    |
| `api_key_hash` | VARCHAR   | HMAC-SHA256 (with pepper) of the full API key |
| `created_at`   | TIMESTAMP | When the project was created                  |
| `updated_at`   | TIMESTAMP | Last update time                              |

The API key looks like `fk_<api_key_id>_<secret>`. The plaintext key is
shown once at creation; only its HMAC is stored. To authenticate, look up
the project by `api_key_id`, HMAC the presented key and compare in
constant time.

Example record:

```json
{
  "id": "project_123",
  "account_id": "account_123",
  "name": "E-commerce",
  "api_key_id": "a1B2c3D4e5"
}
```

### Relationship with other tables

- One project can have many feature flags.
- Each feature flag belongs to one project.

The relationships are:

- `accounts.id` → `projects.account_id`
- `projects.id` → `feature_flags.project_id`

Recommended constraint:

```sql
UNIQUE (api_key_id)
```

### When is it used?

1.  When a user creates a project, insert a row into `projects`.
2.  When a user creates a flag, save the project's ID in
    `feature_flags.project_id`.
3.  During evaluation, identify the project using the SDK credential or
    project context, then look up the flag within that project.

---

## 5. Table 2 --- `feature_flags`

### What does this table represent?

`feature_flags` is the central table. It stores each flag's identity,
type, and global switch.

Examples:

- `new_checkout` --- Boolean flag.
- `dark_mode` --- Boolean flag.
- `homepage_experiment` --- Multivariate flag.

### Why do we need it?

The service needs a persistent definition of every flag. It must know:

- Which project owns the flag.
- What key the application uses to evaluate it.
- Whether it is a Boolean or multivariate flag.
- Whether it is globally switched on.

Who receives the flag is decided by the flag's targeting rules, not by
this table.

### Suggested columns

| Column        | Type      | Purpose                             |
| ------------- | --------- | ----------------------------------- |
| `id`          | UUID      | Primary key                         |
| `project_id`  | UUID      | References `projects.id`            |
| `key`         | VARCHAR   | Identifier used by the SDK          |
| `description` | TEXT      | Optional explanation                |
| `type`        | ENUM      | `boolean` or `multivariate`         |
| `enabled`     | BOOLEAN   | Global kill switch: is the flag on? |
| `created_at`  | TIMESTAMP | Creation time                       |
| `updated_at`  | TIMESTAMP | Last update time                    |

Example Boolean flag:

```json
{
  "project_id": "project_123",
  "key": "new_checkout",
  "description": "Redesigned checkout flow",
  "type": "boolean",
  "enabled": true
}
```

### What does `enabled` mean?

`enabled` is the global kill switch: is the flag on?

- `true`: the flag is evaluated normally.
- `false`: immediately return the disabled result, regardless of rules.

This is useful when a feature causes problems and needs to be switched
off quickly.

An enabled flag does not necessarily return `true` for every user. It
only means the flag is allowed to decide. The flag's rules then decide
who gets `true`. A new flag's default rule is at 0%, so it reaches
nobody until a rule is edited.

There is deliberately no flag-level rollout percentage and no "default
value" column. A Boolean flag only ever serves `true` or `false`: it is
`false` when disabled or when the user passes no rule, and `true` for
users who pass a rule. "Enabled for everyone except one country" is a
rule `country not_equals IN` at 100%.

### Relationship with other tables

- Many feature flags belong to one project.
- One feature flag can have many variants in `flag_variants`.
- One feature flag has one or more targeting rules in `targeting_rules`.

Relationships:

- `projects.id` → `feature_flags.project_id`
- `feature_flags.id` → `flag_variants.flag_id`
- `feature_flags.id` → `targeting_rules.flag_id`

Recommended constraint:

```sql
UNIQUE (project_id, key)
```

The flag key only needs to be unique within its project.

### When is it used?

1.  When creating a flag, insert its definition and its default rule
    (no conditions, 0% rollout) in one transaction.
2.  When evaluating a flag, find it by project and flag key.
3.  Check `enabled` before evaluating rules.
4.  Evaluate the flag's rules to decide the result.

---

## 6. Table 3 --- `flag_variants`

### What does this table represent?

`flag_variants` stores the possible variations of a multivariate flag.

For example, a homepage experiment might have:

- `control`
- `blue`
- `green`

The variants define the possible outcomes. Each variant also stores its
`rollout_percentage`: the share of users who receive it among the users
who pass a rule.

### Why do we need it?

A multivariate flag must be able to return one of several alternatives
rather than just `true` or `false`.

Who is eligible is decided by the rules. How the eligible users are split
between the variants is decided here, once for the whole flag. This keeps
the two questions separate: a rule's rollout says how many users get _a_
variant, and the variants' percentages say which one.

### Suggested columns

| Column               | Type      | Purpose                                 |
| -------------------- | --------- | --------------------------------------- |
| `id`                 | UUID      | Primary key                             |
| `flag_id`            | UUID      | References `feature_flags.id`           |
| `key`                | VARCHAR   | Stable variant identifier               |
| `description`        | TEXT      | Optional explanation                    |
| `payload`            | JSONB     | Optional data returned with the variant |
| `rollout_percentage` | INTEGER   | Percentage (0-100) of users, default 0  |
| `created_at`         | TIMESTAMP | Creation time                           |

Example variants:

| key       | description | payload               | rollout_percentage |
| --------- | ----------- | --------------------- | -----------------: |
| `control` | Current UI  | `{"theme":"default"}` |                 50 |
| `blue`    | Blue theme  | `{"theme":"blue"}`    |                 25 |
| `green`   | Green theme | `{"theme":"green"}`   |                 25 |

This means users who pass a rule receive `control` 50% of the time,
`blue` 25% and `green` 25%. The percentages of a flag's variants must
sum to 100.

### What is `rollout_percentage` used for?

When a user passes a rule that does not force a variant, the engine
loads the flag's variants and uses deterministic hashing to pick one
according to their `rollout_percentage` values.

It is a plain integer column rather than JSON so that the database can
enforce the 0-100 range. `payload` stays reserved for data returned to
the application, not allocation settings.

### What is `payload` used for?

The payload contains optional data associated with the selected variant.

For example, when the `blue` variant is selected, the service could
return:

```json
{
  "variant": "blue",
  "payload": {
    "theme": "blue"
  }
}
```

The application decides how to use that data.

### Relationship with other tables

- One feature flag can have many variants.
- A variant belongs to exactly one feature flag.
- A variant can be forced by several `targeting_rules` through
  `targeting_rules.variant_id`.

Relationships:

- `feature_flags.id` → `flag_variants.flag_id`
- `flag_variants.id` → `targeting_rules.variant_id`

Recommended constraint:

```sql
UNIQUE (flag_id, key)
CHECK (rollout_percentage BETWEEN 0 AND 100)
```

### When is it used?

1.  When a user creates a multivariate flag, they define its variants
    together with their percentages.
2.  During evaluation, once a rule is passed, the engine selects one
    variant from the weighted percentages (or uses the rule's forced
    variant) and returns its key and payload.

Important: a new variant starts with `rollout_percentage = 0`, so it
receives no traffic until a percentage is set. The percentages of a
flag's variants are always saved together so they can be checked to
sum to 100.

---

## 7. Table 4 --- `targeting_rules`

### What does this table represent?

`targeting_rules` stores the audiences of a feature flag and how much of
each audience receives it.

For example:

> Enable the new checkout for premium users in India.

Or:

> Give users in the US a 50% chance of receiving the new checkout.

A flag has one or more targeting rules. The first one, with no conditions
and a 0% rollout, is created together with the flag.

### Why do we need it?

Not every user should necessarily receive the same treatment.

A product team may want to:

- Release a feature to a particular country.
- Enable a feature only for premium customers.
- Release a feature to internal users first.
- Roll out a feature gradually, to everyone or to a matching audience.
- Send a specific audience to a specific variant.

Each of these is a rule. A plain percentage rollout is just a rule with
no conditions.

### Suggested columns

| Column               | Type      | Purpose                                     |
| -------------------- | --------- | ------------------------------------------- |
| `id`                 | UUID      | Primary key                                 |
| `flag_id`            | UUID      | References `feature_flags.id`               |
| `priority`           | INTEGER   | Evaluation order                            |
| `enabled`            | BOOLEAN   | Whether this rule is active                 |
| `rollout_percentage` | INTEGER   | Share of matching users who pass, default 0 |
| `variant_id`         | UUID      | Optional forced variant, `flag_variants.id` |
| `created_at`         | TIMESTAMP | Creation time                               |

Example:

```json
{
  "flag_id": "flag_123",
  "priority": 1,
  "enabled": true,
  "rollout_percentage": 30
}
```

Its conditions are stored in `rule_conditions`.

### Explanation of important fields

**`priority`**

Multiple rules may match the same user. Priority determines the order in
which they are tried.

For V1:

- Lower number means higher priority.
- Evaluate rules in ascending priority order.
- The first enabled rule the user passes wins.
- A user who matches a rule but misses its rollout falls through to the
  next rule.

For example:

```text
Rule A — priority 1:
country = IN AND plan = premium, rollout 100%

Rule B — priority 2:
country = IN, rollout 20%

Rule C — priority 3:
no conditions, rollout 5%
```

A premium user in India passes Rule A and gets the feature. Another user
in India misses A's conditions, passes B if they fall in the 20%, and
otherwise falls through to C.

Because all rules share the same bucket for a user, a later rule with an
equal or smaller percentage can never add users that an earlier, broader
rule missed. Only a larger percentage can.

Make sure the priority order reflects the intended behavior. A more
specific rule should generally be placed before a broader one. Priority
is unique within a flag.

**`enabled`**

Allows a user to deactivate a rule without deleting it. A disabled rule
is skipped. A flag always keeps at least one rule, even if all of them
are disabled, in which case nobody passes.

**`rollout_percentage`**

Controls how many of the users matching the rule pass it. A rule with no
conditions and 100% passes everybody.

A new flag's default rule is at 0%, so it passes nobody.

**`variant_id`**

Only used by multivariate flags. When set, every user who passes the rule
receives that variant, ignoring the flag's variant percentages. When
empty, the user's variant is chosen from `flag_variants.rollout_percentage`.

The variant must belong to the same flag as the rule. Deleting a variant
clears `variant_id` on the rules that forced it.

### Relationship with other tables

- Many targeting rules belong to one feature flag.
- One targeting rule has many conditions in `rule_conditions`.
- One targeting rule can force one variant in `flag_variants`.

Relationships:

- `feature_flags.id` → `targeting_rules.flag_id`
- `targeting_rules.id` → `rule_conditions.rule_id`
- `flag_variants.id` → `targeting_rules.variant_id`

Recommended constraints:

```sql
UNIQUE (flag_id, priority)
CHECK (rollout_percentage BETWEEN 0 AND 100)
```

### When is it used?

1.  The evaluation engine loads the flag's enabled rules.
2.  It sorts them by priority.
3.  It evaluates each rule's conditions against the supplied user
    properties.
4.  It checks whether the user's bucket is inside the rule's rollout.
5.  The first rule the user passes decides the result.
6.  For a multivariate flag, it uses the rule's forced variant, or picks
    one by the variants' percentages.

---

## 8. Table 5 --- `rule_conditions`

### What does this table represent?

`rule_conditions` stores the individual conditions that make up a
targeting rule.

A rule can contain one condition, several conditions, or none. A rule
with no conditions matches every user.

For example:

```text
Rule: Indian premium users

country equals IN
AND
plan equals premium
```

This is stored as two separate condition records.

### Why do we need it?

The service needs a flexible way to let project users define targeting
rules without creating a new database column for every possible user
property.

Different applications have different properties:

- `country`
- `plan`
- `age`
- `email`
- `accountType`
- `subscriptionStatus`

The service should not need to know all possible properties in advance.
It simply evaluates the attributes supplied in the SDK request.

### Suggested columns

| Column      | Type    | Purpose                         |
| ----------- | ------- | ------------------------------- |
| `id`        | UUID    | Primary key                     |
| `rule_id`   | UUID    | References `targeting_rules.id` |
| `attribute` | VARCHAR | User property to inspect        |
| `operator`  | VARCHAR | Comparison operation            |
| `value`     | JSONB   | Value to compare against        |

Example records:

| rule_id  | attribute | operator | value       |
| -------- | --------- | -------- | ----------- |
| `rule_1` | country   | equals   | `"IN"`      |
| `rule_1` | plan      | equals   | `"premium"` |

### Why use JSONB for `value`?

Different operators may need different value types.

Examples:

```json
"IN"
```

```json
["IN", "US", "UK"]
```

```json
18
```

Using JSONB allows the condition to store strings, numbers, booleans, or
arrays.

### Supported operators for V1

| Operator       | Example                   |
| -------------- | ------------------------- |
| `equals`       | country equals IN         |
| `not_equals`   | country not_equals IN     |
| `in`           | country in \[IN, US\]     |
| `not_in`       | country not_in \[IN, US\] |
| `greater_than` | age greater_than 18       |
| `less_than`    | age less_than 60          |
| `contains`     | email contains gmail.com  |

The evaluation engine must validate that the operator is supported and
that the comparison value has an appropriate type.

### How are multiple conditions evaluated?

For V1, all conditions inside one rule use AND.

Example:

```text
country = IN
AND
plan = premium
AND
accountStatus = active
```

The rule matches only if all three conditions match.

What if the product team wants:

```text
(country = IN AND plan = premium)
OR
(country = US AND plan = premium)
```

Create two targeting rules:

Rule 1:

```text
country = IN
AND
plan = premium
```

Rule 2:

```text
country = US
AND
plan = premium
```

This avoids introducing nested AND/OR expression groups in V1.

### Relationship with other tables

- Each condition belongs to one targeting rule.
- A rule can have multiple conditions.

Relationship:

`targeting_rules.id` → `rule_conditions.rule_id`

### When is it used?

When evaluating a targeting rule, the engine:

1.  Reads its conditions.
2.  Looks up each condition's attribute in the supplied user properties.
3.  Applies the requested operator.
4.  Combines the results using AND.
5.  Marks the rule as matching only when all conditions pass.

Example SDK context:

```ts
{
  userId: "user_123",
  properties: {
    country: "IN",
    plan: "premium"
  }
}
```

The service compares those properties with the condition records.

The service does not need to query the customer's user database.

---

## 9. How the five tables work together

This section summarizes the table usage in real scenarios.

### Use case 1: Simple Boolean flag

Requirement:

```text
Flag: dark_mode
Enabled: true
On for everyone.
```

Tables involved:

- `projects`
- `feature_flags`
- `targeting_rules` (the default rule)

The flag's default rule has no conditions and its rollout is set to 100%.

The engine finds the flag, checks the global switch, and finds that the
default rule matches every user and every user is inside 100%.

Result:

```json
{
  "enabled": true
}
```

### Use case 2: Boolean flag with percentage rollout

Requirement:

```text
Flag: new_checkout
Enabled: true
On for 20% of users.
```

Tables involved:

- `projects`
- `feature_flags`
- `targeting_rules` (the default rule, set to 20%)

The engine calculates a stable bucket for the user. Users in the first
20 buckets pass the rule and receive the feature; the remaining users do
not.

No user assignment records are required.

### Use case 3: Boolean flag with user targeting

Requirement:

```text
Flag: premium_dashboard

country = IN
AND
plan = premium

Enable for 100% of matching users. Nobody else gets it.
```

Tables involved:

- `projects`
- `feature_flags`
- `targeting_rules`
- `rule_conditions`

The flag has one rule with two conditions and a 100% rollout. Users who
match both conditions pass it. Everyone else passes no rule and receives
`false`.

### Use case 4: Boolean flag with a targeted rollout and everyone else

Requirement:

```text
Flag: new_checkout

Rule 1 (priority 1):
  country = IN
  plan = premium
  rollout = 30%

Rule 2 (priority 2):
  no conditions
  rollout = 5%
```

Tables involved:

- `projects`
- `feature_flags`
- `targeting_rules`
- `rule_conditions`

Premium users in India enter the 30% rollout. A user who misses it, or
who does not match, falls through to Rule 2, which has no conditions and
covers everybody at 5%.

"Enabled for everyone except one country" is a single rule:

```text
country not_equals IN, rollout 100%
```

### Use case 5: Multivariate flag without targeting

Requirement:

```text
Flag: homepage_experiment

control = 50%
blue = 25%
green = 25%
Shown to every user.
```

Tables involved:

- `projects`
- `feature_flags`
- `flag_variants`
- `targeting_rules` (the default rule, set to 100%)

Every user passes the default rule. The engine then selects a variant
using the variants' `rollout_percentage` values.

### Use case 6: Multivariate flag with targeting

Requirement:

```text
Flag: checkout_experiment

variants: control 50%, variant_a 50%

Rule 1 (priority 1):
  plan = internal
  rollout = 100%
  forced variant = variant_a

Rule 2 (priority 2):
  no conditions
  rollout = 20%
```

Tables involved:

- `projects`
- `feature_flags`
- `flag_variants`
- `targeting_rules`
- `rule_conditions`

Internal users always receive `variant_a`. Of everyone else, 20% pass
Rule 2 and are split 50/50 between `control` and `variant_a`. The
remaining users pass no rule and receive the disabled result.

---

## 10. Important evaluation behavior

The following rules should be consistent throughout the implementation.

### Step 1: Find the flag

Find the flag using its project and key.

```text
project_id + flag_key
```

If the flag does not exist, return the agreed fallback result.

### Step 2: Check the global kill switch

If `feature_flags.enabled` is false, return disabled immediately.

This takes precedence over all targeting rules.

### Step 3: Compute the user's bucket

```text
bucket = hash(userId + flagKey) % 100
```

The same bucket is used for every rule of the flag.

### Step 4: Find the first rule the user passes

Load enabled rules ordered by ascending priority.

For each rule:

- Read its conditions.
- Evaluate all conditions against the user context. All conditions must
  pass. A rule with no conditions matches every user.
- Check that the user's bucket is below the rule's `rollout_percentage`.

The first rule that passes both checks wins. A user who matches a rule
but misses its rollout continues to the next rule.

If the user passes no rule, return the disabled result.

### Step 5: Evaluate according to flag type

For a Boolean flag:

- Return `true`.

For a multivariate flag:

- If the winning rule has a `variant_id`, return that variant.
- Otherwise pick a variant by the variants' `rollout_percentage`, using
  a second hash that is independent of the rollout bucket, so that
  variant choice does not depend on who was eligible.

### Step 6: Return the result

Boolean response:

```json
{
  "enabled": true
}
```

Multivariate response:

```json
{
  "enabled": true,
  "variant": "blue",
  "payload": {
    "theme": "blue"
  }
}
```

A multivariate flag that is disabled, or that the user passes no rule for,
returns `"enabled": false` with `"variant": null` and `"payload": null`.

---

## 11. Important implementation constraints

Some rules are best enforced when creating or updating configurations.

| Validation                                        | Reason                                          |
| ------------------------------------------------- | ----------------------------------------------- |
| Project API key ID is unique                      | Allow lookup of a project by key                |
| Flag key is unique within a project               | Avoid ambiguous flag lookup                     |
| Variant key is unique within a flag               | Avoid duplicate variant identifiers             |
| Rollout percentages are between 0 and 100         | Keep percentages valid                          |
| Variant percentages sum to 100                    | Ensure every user passing a rule gets a variant |
| A flag has at least one rule                      | Every flag has a rollout to edit                |
| Rule priority is unique within a flag             | Ensure predictable rule selection               |
| Forced variant belongs to the same flag           | Prevent cross-flag references                   |
| Boolean flags have no variants or forced variants | Keep flag types consistent                      |

Validate in the application when saving. Save a flag's variants together,
and create a flag together with its default rule, in a database
transaction.

For referential integrity, consider composite foreign keys or
transactional application validation to ensure that a rule can only
reference variants belonging to its own flag.

## 12. Why we do not store individual user assignments

For the initial implementation, we do not need a table containing every
user's assigned flag value or variant.

Instead, use deterministic hashing.

Conceptually:

```ts
const bucket = hash(userId + flagKey) % 100;
```

For a 50/50 experiment:

```text
0–49  → control
50–99 → variant_a
```

The same user and allocation inputs produce the same bucket, so the user
gets a consistent assignment without a database record.

A future version could introduce persisted assignments if we need to
preserve experiment membership across allocation changes or support more
advanced experimentation behavior.

## 13. Final table responsibility reference

| Table             | Main responsibility                                                 |
| ----------------- | ------------------------------------------------------------------- |
| `projects`        | Groups feature flags under an application                           |
| `feature_flags`   | Defines a flag, its type and its kill switch                        |
| `flag_variants`   | Defines possible variants and how users who pass a rule are split   |
| `targeting_rules` | Defines audiences, their rollout percentage and evaluation priority |
| `rule_conditions` | Stores the individual conditions used to match an audience          |

## 14. Recommended implementation order

Do not implement all five tables and all evaluation behavior at once.

Build the system incrementally:

1.  Create `projects` and `feature_flags`.
2.  Implement flag creation, updates, deletion, and the kill switch.
3.  Add `targeting_rules` and create a default rule (no conditions, 0%)
    together with every flag.
4.  Implement deterministic percentage rollout, rule priority and
    fall-through using the default rule.
5.  Add `rule_conditions` and implement condition evaluation.
6.  Add `flag_variants`, including `rollout_percentage`.
7.  Implement multivariate evaluation and forced variants.
8.  Add caching so evaluations do not require several database queries
    every time.

The database should remain the source of truth. Later, the service can
load a complete flag configuration, including rules, conditions,
variants, and percentages, into a cache and evaluate from that cached
configuration.

---

## 15. The most important distinction to remember

There are three different concepts in this schema:

1.  **A variant is an option.** `flag_variants` defines what choices
    exist.
2.  **A rule is an audience and how much of it gets the flag.**
    `targeting_rules` and `rule_conditions` define who belongs to the
    audience and what share of it passes.
3.  **A split is a distribution.** `flag_variants.rollout_percentage`
    defines how the users who pass a rule are divided among the
    available choices, unless the rule forces one variant.

For Boolean flags, passing a rule means getting `true`, and the rule's
rollout percentage is the only dial.

Once these three concepts are clear, the purpose of all five tables
becomes much easier to understand.
