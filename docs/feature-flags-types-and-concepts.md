# Feature Flags --- Types, Concepts, and Examples

## 1. What is a feature flag?

A **feature flag** (also called a feature toggle) is a mechanism that
lets an application decide at runtime whether a feature or behavior
should be available.

Instead of deploying code every time you want to enable or disable a
feature, you put a decision point in your application and control that
decision through a flag.

For example:

```ts
const enabled = await client.isEnabled("new_checkout");

if (enabled) {
  showNewCheckout();
} else {
  showOldCheckout();
}
```

At its core, a feature-flag system is an **evaluation engine**:

> Given a flag configuration and a user's context, evaluate the rules
> and return a result.

The result might be a Boolean (`true` or `false`) or a variant such as
`control`, `variant_a`, or `variant_b`.

---

## 2. The main types and capabilities

The concepts below are often presented as different flag types. They are
not all separate data types, though: some describe the value a flag
returns, while others describe how the evaluation engine decides who
receives that value.

### 2.1 Boolean flag (release flag)

**Meaning:** A simple ON/OFF switch. It answers: "Should this feature be
enabled?"

Example configuration:

```json
{
  "key": "new_checkout",
  "enabled": true
}
```

Application usage:

```ts
const enabled = await client.isEnabled("new_checkout");

if (enabled) {
  showNewCheckout();
} else {
  showOldCheckout();
}
```

**Where it is useful:**

- Releasing a new feature.
- Hiding an unfinished feature.
- Enabling a feature for internal employees.
- Turning off a feature that is causing problems.

**Mental model:** A light switch --- ON or OFF.

### 2.2 Percentage rollout

**Meaning:** Enable a feature for a percentage of users rather than
everyone at once.

For example, release a new checkout experience to 5% of users first,
then increase to 20%, 50%, and eventually 100%.

Example configuration:

```json
{
  "key": "new_checkout",
  "enabled": true,
  "rollout": {
    "percentage": 20
  }
}
```

A common implementation uses a stable hash of the user ID and flag key:

```ts
function getBucket(userId: string, flagKey: string): number {
  return stableHash(`${userId}:${flagKey}`) % 100;
}

const enabled = getBucket(user.id, "new_checkout") < 20;
```

Conceptually, the 100 possible buckets are split like this:

```text
Buckets 0–19   → enabled (20%)
Buckets 20–99  → disabled (80%)
```

Because the same user and flag key produce the same bucket, the user
gets a consistent result on subsequent evaluations. This is often called
a **sticky assignment**.

**Where it is useful:**

- Gradually releasing a feature.
- Reducing the risk of a release.
- Testing a feature with a small share of real traffic before
  expanding access.

**Important:** A percentage rollout does not mean randomly choosing a
new result on every request. Use a stable assignment so a user does not
keep switching between enabled and disabled.

### 2.3 Targeted release

**Meaning:** Enable a feature only for users whose attributes match
configured conditions.

For example, enable a feature only for users in India who are on a
premium plan.

Example configuration:

```json
{
  "key": "new_checkout",
  "enabled": true,
  "rules": [
    {
      "attribute": "country",
      "operator": "equals",
      "value": "IN"
    },
    {
      "attribute": "plan",
      "operator": "equals",
      "value": "premium"
    }
  ]
}
```

The application supplies the current user's context:

```ts
const result = await client.evaluate("new_checkout", {
  userId: "user_123",
  country: "IN",
  plan: "premium",
});
```

The evaluation engine checks the user's attributes against the rules.

```text
User context
    |
    v
country == "IN"?
    |
   YES
    |
    v
plan == "premium"?
    |
   YES
    |
    v
Enable the feature
```

The feature-flag service generally does not need to copy or maintain the
application's entire user database. The application can pass the
relevant user attributes when it evaluates a flag.

**Where it is useful:**

- Releasing a feature to users in a particular country.
- Enabling features for premium subscribers.
- Giving employees or internal testers early access.
- Allowing access for a specific set of user IDs.

### 2.4 Multivariate flag (A/B/N testing)

**Meaning:** Instead of returning only `true` or `false`, return one of
several configured variants.

Suppose you want to test three checkout designs:

- `control`: the existing design.
- `variant_a`: a first new design.
- `variant_b`: a second new design.

Example configuration:

```json
{
  "key": "checkout_experiment",
  "enabled": true,
  "type": "multivariate",
  "variants": [
    { "key": "control", "weight": 50 },
    { "key": "variant_a", "weight": 25 },
    { "key": "variant_b", "weight": 25 }
  ]
}
```

The weights describe the intended distribution: 50% control, 25% variant
A, and 25% variant B.

The application asks for the assigned variant:

```ts
const variant = await client.getVariant("checkout_experiment", {
  userId: "user_123",
});
```

Example result:

```json
{
  "variant": "variant_a"
}
```

The application chooses the experience:

```ts
switch (variant) {
  case "control":
    showOriginalCheckout();
    break;

  case "variant_a":
    showCheckoutA();
    break;

  case "variant_b":
    showCheckoutB();
    break;
}
```

A stable hash-based assignment can distribute users into variant buckets
and keep each user's assignment consistent.

**Where it is useful:**

- A/B or A/B/N testing.
- Comparing different UI designs.
- Testing onboarding flows.
- Comparing different user experiences.

**Important distinction:** A multivariate flag assigns a variant.
Measuring which variant performs best requires a separate analytics or
experimentation measurement process.

### 2.5 Targeted multivariate flag

**Meaning:** Combine audience targeting with variant assignment.
Different groups can receive different variant distributions.

For example:

- Users in India: 50% control and 50% variant A.
- Users in the USA: 20% control and 80% variant B.

Example configuration:

```json
{
  "key": "checkout_experiment",
  "enabled": true,
  "rules": [
    {
      "conditions": [
        {
          "attribute": "country",
          "operator": "equals",
          "value": "IN"
        }
      ],
      "variants": [
        { "key": "control", "weight": 50 },
        { "key": "variant_a", "weight": 50 }
      ]
    },
    {
      "conditions": [
        {
          "attribute": "country",
          "operator": "equals",
          "value": "US"
        }
      ],
      "variants": [
        { "key": "control", "weight": 20 },
        { "key": "variant_b", "weight": 80 }
      ]
    }
  ]
}
```

Conceptually:

```text
                 User
                   |
             Check country
                   |
          +--------+--------+
          |                 |
         India              USA
          |                 |
        50 / 50            20 / 80
          |                 |
     Control or A      Control or B
```

**Where it is useful:**

- Running different experiments in different markets.
- Testing different experiences for different customer segments.
- Combining eligibility rules with controlled variant distribution.

---

## 3. Quick comparison

---

Concept Evaluation result Main purpose

---

Boolean flag `true` / `false` Turn a feature on or
off

Percentage rollout `true` / `false` Gradually release to a
percentage of users

Targeted release `true` / `false` Enable for users
matching conditions

Multivariate flag Variant key Assign users to
experiment variants

Targeted multivariate Variant key Target audiences and
assign variants

---

The key distinction is:

- **Value type:** What does the flag return? For example, Boolean or
  variant.
- **Evaluation rules:** How does the system decide what to return? For
  example, user targeting or percentage rollout.
- **Operational purpose:** Why is the flag being used? For example, a
  gradual release.

These concepts can overlap. A Boolean flag can have targeting rules and
a percentage rollout.

---

## 4. How evaluation fits together

A generic evaluation engine can follow a flow like this:

```text
             Evaluation request
                     |
                     v
             Load flag configuration
                     |
                     v
              Is flag enabled?
                 /       \
               No         Yes
               |           |
               v           v
         Return default   Evaluate targeting
                              |
                       Does user match?
                         /        \
                       No          Yes
                       |            |
                       v            v
                  Return default  Apply rollout
                                      |
                                      v
                               Select flag value
                               or experiment variant
                                      |
                                      v
                                Return result
```

The exact order and fallback behavior should be defined by the system's
evaluation rules. For example, the system needs a clear default value
when a flag is disabled or no targeting rule matches.

---

## 5. Recommended scope for a first version

For a focused feature-flag project, start with a small set of reusable
capabilities instead of implementing every concept as a separate flag
type.

### Flag value types

1.  **Boolean**
    - Returns enabled or disabled.
2.  **Multivariate**
    - Returns one configured variant key.

### Evaluation capabilities

- User attribute conditions, such as `country`, `plan`, and `userId`.
- AND / OR condition groups.
- Percentage rollout.
- Stable, deterministic user-to-bucket assignment.
- A default or fallback value.

### Operational controls

- Enable or disable a flag.
- Use flags in separate environments, such as development and
  production.

A single generic evaluation API can support these capabilities:

```ts
const result = await client.evaluate("new_checkout", {
  userId: "user_123",
  country: "IN",
  plan: "premium",
});
```

For a Boolean flag, the result might be:

```json
{
  "enabled": true
}
```

For a multivariate flag, the result might be:

```json
{
  "enabled": true,
  "variant": "variant_a"
}
```

---

## 6. Key takeaways

1.  A feature flag controls application behavior at runtime.
2.  Boolean flags are simple ON/OFF switches.
3.  Percentage rollout gradually exposes a feature to a stable
    percentage of users.
4.  Targeting uses user attributes to decide who is eligible.
5.  Multivariate flags assign users to one of multiple variants.
6.  Targeted multivariate flags combine targeting and variant
    assignment.
7.  Percentage rollout and targeting are evaluation capabilities; they
    do not need to be separate flag value types.
8.  Stable hashing can provide consistent user assignments without
    storing every assignment in the database.
9.  The central component is the evaluation engine: **flag
    configuration + user context → evaluation result**.
