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
- There is no separate `flag_configs` or default-allocation table. A flag has one
  configuration, stored directly on `feature_flags`. The default
  variant distribution of a multivariate flag is stored on the variants
  themselves, as `flag_variants.default_weight`.
- The system supports Boolean and multivariate flags.
- Targeting rules match user properties supplied by the customer's
  application.
- Percentage rollouts and variant assignments use deterministic
  hashing. Individual user assignments do not need to be stored in the
  database for the initial implementation.
- Conditions inside one rule are combined with AND. Multiple rules
  provide alternative matching paths (effectively OR).
- The first enabled matching rule, ordered by priority, wins.

The six tables are:

1.  `projects`
2.  `feature_flags`
3.  `flag_variants`
4.  `targeting_rules`
5.  `rule_conditions`
6.  `rule_variants`

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

A targeting rule describes an audience that should receive a treatment.
For example:

> If country is IN and plan is premium, enable the feature for 30% of
> matching users.

A rule contains one or more conditions. A Boolean rule has a Boolean
treatment and rollout percentage. A multivariate rule has a distribution
of variants.

### Default treatment

The default treatment is used when no targeting rule matches.

- For a Boolean flag, it is controlled by `default_value` and
  `rollout_percentage` on `feature_flags`.
- For a multivariate flag, it is controlled by the
  `default_weight` of each row in `flag_variants`.

This distinction is important: the default Boolean settings and the
default multivariate allocation are two different ways of describing the
fallback behavior for the two flag types.

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
type, and default configuration.

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
- What treatment to use when no targeting rule matches.

### Suggested columns

| Column               | Type      | Purpose                                |
| -------------------- | --------- | -------------------------------------- |
| `id`                 | UUID      | Primary key                            |
| `project_id`         | UUID      | References `projects.id`               |
| `key`                | VARCHAR   | Identifier used by the SDK             |
| `description`        | TEXT      | Optional explanation                   |
| `type`               | ENUM      | `boolean` or `multivariate`            |
| `is_active`          | BOOLEAN   | Global kill switch: is the flag live?  |
| `default_value`      | BOOLEAN   | Boolean served when no rule matches    |
| `rollout_percentage` | INTEGER   | Share of those users who get the value |
| `created_at`         | TIMESTAMP | Creation time                          |
| `updated_at`         | TIMESTAMP | Last update time                       |

Example Boolean flag:

```json
{
  "project_id": "project_123",
  "key": "new_checkout",
  "description": "Redesigned checkout flow",
  "type": "boolean",
  "is_active": true,
  "default_value": false,
  "rollout_percentage": 0
}
```

### What do the configuration fields mean?

**`is_active` --- global kill switch**

This is the top-level switch for the flag: is it live?

- `true`: the flag is evaluated normally.
- `false`: immediately return the disabled result, regardless of rules
  or rollout.

This is useful when a feature causes problems and needs to be switched
off quickly.

Note that an active flag does not necessarily return `true`. It only
means the flag is allowed to decide. For example, an active flag whose
`default_value` is `false` still returns `false` to users who match no
rule.

**`default_value` --- default Boolean value**

This is the Boolean result for users who do not match any targeting
rule, before applying the default rollout.

For example, if it is `false`, unmatched users receive `false`.

**`rollout_percentage` --- default Boolean rollout**

This controls the percentage of users who receive the default value.

For example:

```text
is_active = true
default_value = true
rollout_percentage = 20
```

The system enables the feature for 20% of users who reach the default
treatment.

If `default_value` is false, the default Boolean result is false; a
positive rollout percentage should not turn it on.

### Relationship with other tables

- Many feature flags belong to one project.
- One feature flag can have many variants in `flag_variants`.
- One feature flag can have many targeting rules in `targeting_rules`.

Relationships:

- `projects.id` → `feature_flags.project_id`
- `feature_flags.id` → `flag_variants.flag_id`
- `feature_flags.id` → `targeting_rules.flag_id`

Recommended constraints:

```sql
UNIQUE (project_id, key)
CHECK (rollout_percentage BETWEEN 0 AND 100)
```

The flag key only needs to be unique within its project.

### When is it used?

1.  When creating a flag, insert its definition and default
    configuration.
2.  When evaluating a flag, find it by project and flag key.
3.  Check `is_active` before evaluating rules.
4.  If no rule matches, use the default Boolean settings or default
    variant allocation, depending on the flag type.

---

## 6. Table 3 --- `flag_variants`

### What does this table represent?

`flag_variants` stores the possible variations of a multivariate flag.

For example, a homepage experiment might have:

- `control`
- `blue`
- `green`

The variants define the possible outcomes. Each variant also stores its
`default_weight`: the share of users who receive it when no targeting
rule matches. Weights for targeted audiences are stored separately in
`rule_variants`.

### Why do we need it?

A multivariate flag must be able to return one of several alternatives
rather than just `true` or `false`.

Keeping variants in their own table means the same set of variants can
be referenced by the allocations attached to different targeting rules.
The default allocation is stored directly on each variant as
`default_weight`, because it is a single number per variant with no
other dimension.

### Suggested columns

| Column           | Type      | Purpose                                                  |
| ---------------- | --------- | -------------------------------------------------------- |
| `id`             | UUID      | Primary key                                              |
| `flag_id`        | UUID      | References `feature_flags.id`                            |
| `key`            | VARCHAR   | Stable variant identifier                                |
| `name`           | VARCHAR   | Human-readable variant name                              |
| `payload`        | JSONB     | Optional data returned with the variant                  |
| `default_weight` | INTEGER   | Weight (0-100) when no targeting rule matches, default 0 |
| `created_at`     | TIMESTAMP | Creation time                                            |

Example variants:

| key       | name        | payload               | default_weight |
| --------- | ----------- | --------------------- | -------------: |
| `control` | Control     | `{"theme":"default"}` |             50 |
| `blue`    | Blue Theme  | `{"theme":"blue"}`    |             25 |
| `green`   | Green Theme | `{"theme":"green"}`   |             25 |

This means users who match no targeting rule receive `control` 50% of
the time, `blue` 25% and `green` 25%. The default weights of a flag's
variants must sum to 100.

### What is `default_weight` used for?

It replaces a separate default-allocation table. When no targeting rule
matches, the engine loads the flag's variants and uses deterministic
hashing to pick one according to their `default_weight` values.

It is a plain integer column rather than JSON so that the database can
enforce the 0-100 range, and so that a weight can never point at a
variant of another flag. `payload` stays reserved for data returned to
the application, not allocation settings.

If the system later supports per-environment defaults, this column
would move into a separate allocation table keyed by environment.

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
- A variant can be referenced by multiple `rule_variants` rows.
- A variant carries its own default weight.

Relationships:

- `feature_flags.id` → `flag_variants.flag_id`
- `flag_variants.id` → `rule_variants.variant_id`

Recommended constraint:

```sql
UNIQUE (flag_id, key)
CHECK (default_weight BETWEEN 0 AND 100)
```

### When is it used?

1.  When a user creates a multivariate flag, they define its variants.
2.  Each variant is given a `default_weight`, which defines the
    distribution for the default audience.
3.  They can also be assigned different weights in `rule_variants` for
    particular targeting rules.
4.  During evaluation, the engine selects one variant from the relevant
    weighted allocation and returns its key and payload.

Important: a new variant starts with `default_weight = 0`, so it
receives no default traffic until a weight is set. Targeting rules need
their own `rule_variants` rows.

---

## 7. Table 4 --- `targeting_rules`

### What does this table represent?

`targeting_rules` stores audience-specific behavior for a feature flag.

For example:

> Enable the new checkout for premium users in India.

Or:

> Give users in the US a 50% chance of receiving the new checkout.

A flag can have multiple targeting rules.

### Why do we need it?

Not every user should necessarily receive the same treatment.

A product team may want to:

- Release a feature to a particular country.
- Enable a feature only for premium customers.
- Release a feature to internal users first.
- Roll out a feature gradually to a matching audience.
- Run different experiment allocations for different audiences.

Each of these audience-specific configurations can be represented as a
rule.

### Suggested columns

| Column               | Type      | Purpose                               |
| -------------------- | --------- | ------------------------------------- |
| `id`                 | UUID      | Primary key                           |
| `flag_id`            | UUID      | References `feature_flags.id`         |
| `name`               | VARCHAR   | Human-readable rule name              |
| `priority`           | INTEGER   | Evaluation order                      |
| `enabled`            | BOOLEAN   | Whether this rule is active           |
| `serve_enabled`      | BOOLEAN   | Boolean treatment if the rule matches |
| `rollout_percentage` | INTEGER   | Boolean rollout for matching users    |
| `created_at`         | TIMESTAMP | Creation time                         |

Example:

```json
{
  "flag_id": "flag_123",
  "name": "Indian premium users",
  "priority": 1,
  "enabled": true,
  "serve_enabled": true,
  "rollout_percentage": 30
}
```

### Explanation of important fields

**`priority`**

Multiple rules may match the same user. Priority determines which
matching rule wins.

For V1:

- Lower number means higher priority.
- Evaluate rules in ascending priority order.
- Use the first enabled matching rule.
- Do not continue to the next rule if the matched rule's rollout
  excludes the user.

For example:

```text
Rule A — priority 1:
country = IN

Rule B — priority 2:
country = IN AND plan = premium
```

A premium user in India matches both. Rule A wins because it has higher
priority.

When creating rules, make sure the priority order reflects the intended
behavior. A more specific rule should generally be placed before a
broader rule if it needs to take precedence.

**`enabled`**

Allows a user to deactivate a rule without deleting it.

**`serve_enabled`**

Defines the Boolean treatment for users matching this rule.

For example:

```text
serve_enabled = true
rollout_percentage = 30
```

Thirty percent of users matching the rule receive `true`; the others
receive `false`.

**`rollout_percentage`**

Controls the rollout within the matching audience, not across all
project users.

For multivariate flags, the variant distribution in `rule_variants` is
used instead.

### Relationship with other tables

- Many targeting rules belong to one feature flag.
- One targeting rule has many conditions in `rule_conditions`.
- One targeting rule can have many variant allocations in
  `rule_variants`.

Relationships:

- `feature_flags.id` → `targeting_rules.flag_id`
- `targeting_rules.id` → `rule_conditions.rule_id`
- `targeting_rules.id` → `rule_variants.rule_id`

### When is it used?

1.  The evaluation engine loads the flag's active rules.
2.  It sorts them by priority.
3.  It evaluates each rule's conditions against the supplied user
    properties.
4.  It uses the first matching rule.
5.  For a Boolean flag, it applies the rule's Boolean treatment and
    rollout.
6.  For a multivariate flag, it uses that rule's variant allocation.

---

## 8. Table 5 --- `rule_conditions`

### What does this table represent?

`rule_conditions` stores the individual conditions that make up a
targeting rule.

A rule can contain one condition or multiple conditions.

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

## 9. Table 6 --- `rule_variants`

### What does this table represent?

`rule_variants` stores the weighted variant distribution for a
particular targeting rule.

It is used for multivariate flags.

Imagine a checkout experiment where users in India should receive:

- Control: 50%
- Variant A: 30%
- Variant B: 20%

The rule determines which audience is eligible. This table determines
how that audience is split among variants.

### Why do we need it?

The same variants may have different distributions for different
audiences.

For example:

| Audience      | Control | Variant A |
| ------------- | ------: | --------: |
| India         |     50% |       50% |
| USA           |     20% |       80% |
| Everyone else |    100% |        0% |

The variants themselves are defined once in `flag_variants`. Their
audience-specific weights belong in `rule_variants`.

This separation avoids duplicating variant definitions for every rule.

### Suggested columns

| Column       | Type    | Purpose                         |
| ------------ | ------- | ------------------------------- |
| `id`         | UUID    | Primary key                     |
| `rule_id`    | UUID    | References `targeting_rules.id` |
| `variant_id` | UUID    | References `flag_variants.id`   |
| `weight`     | INTEGER | Weight for this variant         |

Example records:

| rule_id      | variant_id        | weight |
| ------------ | ----------------- | -----: |
| `india_rule` | `control_variant` |     50 |
| `india_rule` | `blue_variant`    |     30 |
| `india_rule` | `green_variant`   |     20 |

The weights for a fully configured allocation must sum to 100.

### Relationship with other tables

- One targeting rule can have multiple variant allocation records.
- Each allocation record references one variant.
- The referenced variant must belong to the same feature flag as the
  rule.

Relationships:

- `targeting_rules.id` → `rule_variants.rule_id`
- `flag_variants.id` → `rule_variants.variant_id`

Recommended constraint:

```sql
UNIQUE (rule_id, variant_id)
```

### When is it used?

1.  The evaluation engine finds a matching targeting rule.
2.  It loads that rule's variant weights.
3.  It calculates a deterministic bucket for the user.
4.  It selects the variant whose weight range contains that bucket.
5.  It returns the selected variant and payload.

For example, with weights 50, 30, and 20:

```text
Bucket 0–49  → control
Bucket 50–79 → blue
Bucket 80–99 → green
```

---

## 10. How the six tables work together

This section summarizes the table usage in real scenarios.

### Use case 1: Simple Boolean flag

Requirement:

```text
Flag: dark_mode
Active: true
Default value: true
Default rollout: 100%
No targeting rules.
```

Tables involved:

- `projects`
- `feature_flags`

The evaluation engine finds the flag, checks the global switch, finds no
matching rule, and uses the default Boolean configuration.

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
Active: true
Default value: true
Default rollout: 20%
```

Tables involved:

- `projects`
- `feature_flags`

The engine calculates a stable bucket for the user. Users in the first
20 buckets receive the feature; the remaining users do not.

No user assignment records are required.

### Use case 3: Boolean flag with user targeting

Requirement:

```text
Flag: premium_dashboard

country = IN
AND
plan = premium

Enable for 100% of matching users.
```

Tables involved:

- `projects`
- `feature_flags`
- `targeting_rules`
- `rule_conditions`

The engine evaluates the conditions against the supplied user
properties. If they match, it applies the rule's Boolean treatment and
rollout.

### Use case 4: Boolean flag with targeted rollout

Requirement:

```text
Flag: new_checkout

Rule:
  country = IN
  plan = premium
  rollout = 30%
```

Tables involved:

- `projects`
- `feature_flags`
- `targeting_rules`
- `rule_conditions`

Only matching users enter the 30% rollout.

Users who do not match receive the default Boolean treatment.

### Use case 5: Multivariate flag without targeting

Requirement:

```text
Flag: homepage_experiment

control = 50%
blue = 25%
green = 25%
```

Tables involved:

- `projects`
- `feature_flags`
- `flag_variants`

The engine selects a variant using the variants' `default_weight`
values.

### Use case 6: Multivariate flag with targeting

Requirement:

```text
Flag: checkout_experiment

India:
  control = 50%
  variant_a = 50%

USA:
  control = 20%
  variant_a = 80%

Everyone else:
  control = 100%
```

Tables involved:

- `projects`
- `feature_flags`
- `flag_variants`
- `targeting_rules`
- `rule_conditions`
- `rule_variants`

The engine finds the first matching rule and uses its variant
distribution. If no rule matches, it uses the variants' default weights.

---

## 11. Important evaluation behavior

The following rules should be consistent throughout the implementation.

### Step 1: Find the flag

Find the flag using its project and key.

```text
project_id + flag_key
```

If the flag does not exist, return the agreed fallback result.

### Step 2: Check the global kill switch

If `feature_flags.is_active` is false, return disabled immediately.

This takes precedence over all targeting rules and allocations.

### Step 3: Find the first matching targeting rule

Load enabled rules ordered by ascending priority.

For each rule:

- Read its conditions.
- Evaluate all conditions against the user context.
- All conditions must pass.

Use the first matching rule.

### Step 4: Evaluate according to flag type

For a Boolean flag:

- If a rule matches, use `serve_enabled` and that rule's
  `rollout_percentage`.
- If no rule matches, use `default_value` and the flag's
  `rollout_percentage`.

For a multivariate flag:

- If a rule matches, use `rule_variants`.
- If no rule matches, use each variant's `default_weight`.

### Step 5: Return the result

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

---

## 12. Important implementation constraints

Some rules are best enforced when creating or updating configurations.

| Validation                                        | Reason                                         |
| ------------------------------------------------- | ---------------------------------------------- |
| Project API key ID is unique                      | Allow lookup of a project by key               |
| Flag key is unique within a project               | Avoid ambiguous flag lookup                    |
| Variant key is unique within a flag               | Avoid duplicate variant identifiers            |
| Rollout is between 0 and 100                      | Keep percentages valid                         |
| Variant weights are non-negative                  | Prevent invalid allocations                    |
| Allocation weights sum to 100                     | Ensure every bucket maps to a variant          |
| Rule priority is deterministic                    | Ensure predictable rule selection              |
| Variant belongs to the same flag                  | Prevent cross-flag references                  |
| Boolean flags do not use variant allocations      | Keep flag types consistent                     |
| Default weights sum to 100 for multivariate flags | Ensure unmatched users always map to a variant |

Validate weight totals in the application when saving an allocation. Use
a database transaction when inserting or updating multiple allocation
rows, including the `default_weight` values of a flag's variants.

For referential integrity, consider composite foreign keys or
transactional application validation to ensure that a rule can only
reference variants belonging to its own flag.

## 13. Why we do not store individual user assignments

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

## 14. Final table responsibility reference

| Table             | Main responsibility                                                      |
| ----------------- | ------------------------------------------------------------------------ |
| `projects`        | Groups feature flags under an application                                |
| `feature_flags`   | Defines a flag, its type, kill switch, and default Boolean configuration |
| `flag_variants`   | Defines possible variants and their default weights when no rule matches |
| `targeting_rules` | Defines audience-specific behavior and evaluation priority               |
| `rule_conditions` | Stores the individual conditions used to match an audience               |
| `rule_variants`   | Defines variant weights for a matching targeting rule                    |

## 15. Recommended implementation order

Do not implement all six tables and all evaluation behavior at once.

Build the system incrementally:

1.  Create `projects` and `feature_flags`.
2.  Implement flag creation, updates, deletion, and simple Boolean
    evaluation.
3.  Add deterministic percentage rollout.
4.  Add `targeting_rules` and `rule_conditions`.
5.  Implement rule priority and condition evaluation.
6.  Add `flag_variants`, including `default_weight`.
7.  Implement multivariate evaluation.
8.  Add `rule_variants` for targeted experiments.
9.  Add caching so evaluations do not require several database queries
    every time.

The database should remain the source of truth. Later, the service can
load a complete flag configuration, including rules, conditions,
variants, and weights, into a cache and evaluate from that cached
configuration.

---

## 16. The most important distinction to remember

There are three different concepts in this schema:

1.  **A variant is an option.** `flag_variants` defines what choices
    exist.
2.  **A rule is an audience.** `targeting_rules` and `rule_conditions`
    define who belongs to that audience.
3.  **An allocation is a distribution.** `rule_variants` (per rule) and
    `flag_variants.default_weight` (the default) define how traffic is
    split among the available choices.

For Boolean flags, the treatment and rollout are stored directly on the
flag or targeting rule.

Once these three concepts are clear, the purpose of all six tables
becomes much easier to understand.
