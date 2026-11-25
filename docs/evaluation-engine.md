# How Flagkit evaluates a flag

This page explains, in plain language, what happens when an app asks Flagkit
"what should this user see?". For the database tables behind it, see the
[schema guide](database-schema-guide.md).

## 1. The short version

When your app evaluates a flag, Flagkit does this:

1.  Find the flag. Is it switched on at all?
2.  Give the user a number from 0 to 99 (their **bucket**). The same user
    always gets the same number for the same flag.
3.  Go through the flag's **rules**, top to bottom. A user **passes** a rule
    when they match its conditions **and** their bucket is below the rule's
    rollout percentage.
4.  The **first rule the user passes wins**.
5.  If the flag is a multivariate flag, also pick which variant the user gets.
6.  If the user passes no rule, the flag is off for them.

That is the whole engine. The rest of this page explains each step.

## 2. What goes in and what comes out

Your app calls:

```http
POST /evaluate/new_checkout
x-api-key: fk_...

{
  "userId": "user_123",
  "properties": { "country": "IN", "plan": "premium" }
}
```

- `userId` decides where the user lands in a percentage rollout.
- `properties` are facts about the user. Rules compare against them. Flagkit
  never stores your users; it only looks at what you send.
- The API key tells Flagkit which project the flag belongs to.

**A boolean flag** answers with:

```json
{ "key": "new_checkout", "enabled": true }
```

**A multivariate flag** also answers with the variant it chose:

```json
{ "key": "homepage", "enabled": true, "variant": "blue", "payload": { "theme": "blue" } }
```

When a multivariate flag is off for the user, `variant` and `payload` are
`null`:

```json
{ "key": "homepage", "enabled": false, "variant": null, "payload": null }
```

If the flag key doesn't exist in the project, the API answers `404`.

## 3. The pieces the engine looks at

| Piece        | What it is                                          | Where it lives    |
| ------------ | --------------------------------------------------- | ----------------- |
| **Flag**     | Has a key, a type, and an `enabled` kill switch     | `feature_flags`   |
| **Rules**    | An ordered list. Each has conditions and a rollout. | `targeting_rules` |
| Conditions   | "country is IN", "age is greater than 18", ...      | `rule_conditions` |
| **Variants** | Multivariate only: the options and their split      | `flag_variants`   |

Every flag always has at least one rule. A new flag starts with one rule that
has **no conditions** and a **0% rollout**, so it reaches nobody until you
change it.

## 4. Step by step

```text
                 ┌──────────────────────────┐
                 │ Is the flag switched on? │── no ──► OFF
                 └────────────┬─────────────┘
                              │ yes
                 ┌────────────▼─────────────┐
                 │ Work out the user's      │
                 │ bucket (0-99)            │
                 └────────────┬─────────────┘
                              │
             ┌────────────────▼────────────────┐
             │ Take the next rule, top to      │
             │ bottom. Is it turned on?        │── no ──► skip it
             └────────────────┬────────────────┘
                              │ yes
             ┌────────────────▼────────────────┐
             │ Does the user match ALL of its  │── no ──► try the next rule
             │ conditions?                     │
             └────────────────┬────────────────┘
                              │ yes
             ┌────────────────▼────────────────┐
             │ Is the user's bucket below the  │── no ──► try the next rule
             │ rule's rollout percentage?      │
             └────────────────┬────────────────┘
                              │ yes: the user PASSES this rule
                              ▼
                  Boolean flag ──► ON
                  Multivariate ──► ON + a variant

        If every rule is tried and none is passed ──► OFF
```

### Step 1: Is the flag on?

Each flag has an `enabled` switch. If it is off, the answer is **off for
everyone**, straight away. No rule is looked at. This is your kill switch.

### Step 2: Work out the bucket

The engine turns the user into a number from 0 to 99:

```text
bucket = hash(flagKey + ":" + userId) % 100
```

- The same user and flag always give the same bucket. A user doesn't flip
  between on and off from one request to the next.
- The flag key is part of the hash, so a user's bucket for one flag has
  nothing to do with their bucket for another.
- Nothing is stored. The number is recalculated on every request.

### Step 3: Go through the rules

Rules are tried in order, from the first to the last. Turned-off rules are
skipped. For each rule the engine asks two questions:

1.  **Does the user match the conditions?** Every condition must match. A rule
    with no conditions matches everyone.
2.  **Is the user's bucket below the rule's rollout percentage?** With a rollout
    of 30%, buckets 0 to 29 pass and 30 to 99 do not. 100% lets everyone
    through and 0% lets nobody through.

If the answer to both is yes, the user **passes** the rule and the engine stops
looking. The first rule passed wins.

If the user matches a rule but misses its rollout, they are **not** stopped
there. They move on to the next rule. They only get the "off" answer when they
have been through every rule without passing one.

### Step 4: The result

- **Boolean flag:** passing a rule means `enabled: true`.
- **Multivariate flag:** passing a rule means `enabled: true` plus a variant.
  See section 6.
- **No rule passed:** `enabled: false`.

## 5. How conditions are matched

A condition has three parts: the **property** to look at, an **operator**, and a
**value** to compare with.

| Operator          | The user matches when...                                  |
| ----------------- | --------------------------------------------------------- |
| `is`              | their property equals the value                           |
| `is not`          | their property is different from the value                |
| `is one of`       | their property is in the list                             |
| `is not one of`   | their property is not in the list                         |
| `is greater than` | their property is a number above the value                |
| `is less than`    | their property is a number below the value                |
| `contains`        | their property is text that includes the value as a piece |

**AND inside a rule, OR between rules.** All conditions in one rule must match.
If you want "country is IN **or** country is US", make two rules.

A few details that surprise people:

- **A missing property never matches.** If a rule says `plan is not free` and
  the user sent no `plan`, the condition does **not** match, even though "is
  not" sounds like it should. A rule only matches on data it can actually see.
- **A property of the wrong type never matches.** `age is greater than 18` does
  not match when `age` is the text `"19"`. Send numbers as numbers.
- **Matching is exact and case-sensitive.** `"IN"` is not `"in"`, and the number
  `25` is not the text `"25"`.
- **Text vs numbers in the form.** In the flag form, `25` is saved as a number
  and `true` as a boolean. Put quotes around it, like `"25"`, to keep it as
  text.

## 6. Multivariate flags: choosing the variant

A multivariate flag has several variants, for example `control`, `blue` and
`green`. Passing a rule only says that the user gets **a** variant. A second
step decides **which one**.

There are two ways, and each rule picks one:

**A. The rule forces a variant.** Every user who passes the rule gets that
variant. The variants' own percentages are ignored.

**B. No override: split by the variants' percentages.** The variants have
percentages that add up to 100, for example `control 50`, `blue 25`,
`green 25`. The engine works out a **second bucket** and finds the variant whose
slice contains it:

```text
bucket 0-49   ──► control
bucket 50-74  ──► blue
bucket 75-99  ──► green
```

The second bucket uses its own hash, so it is separate from the rollout bucket:

```text
variantBucket = hash("variant:" + flagKey + ":" + userId) % 100
```

**Why a second bucket?** Imagine a rule with a 20% rollout. It lets in the users
whose bucket is 0 to 19. If the variant were chosen from that same bucket, all
those users would land in the first slice and they would **all** get `control`.
A separate bucket spreads the 20% fairly across the variants.

Two things to remember:

- A rule's rollout says **how many** users get a variant. The variants'
  percentages say **which** one.
- A forced variant still needs the user to pass the rule. With a forced
  variant and a 50% rollout, only half of the matching users get it.

## 7. Worked examples

All examples use `new_checkout` as the flag key. These buckets are real:
`user_1` is in bucket **32** and `user_2` is in bucket **86**.

### A brand new flag

One rule, no conditions, 0% rollout.

Everybody matches the (empty) conditions, but nobody's bucket is below 0. Nobody
passes, so the flag is off for everyone. To turn it on for all, set the rule to
100%.

### A 33% rollout

One rule, no conditions, 33%.

- `user_1`: bucket 32 is below 33, so **on**.
- `user_2`: bucket 86 is not below 33, so **off**.

Raise it to 90% and `user_2` turns on as well. Raising a percentage only ever
**adds** users; nobody who was on gets switched off.

### Only premium users in India

One rule, 100%, conditions `country is IN` and `plan is premium`.

| User sends                           | Result                       |
| ------------------------------------ | ---------------------------- |
| `{ country: "IN", plan: "premium" }` | on                           |
| `{ country: "IN", plan: "free" }`    | off (second condition fails) |
| `{ country: "IN" }`                  | off (`plan` is missing)      |
| `{ country: "US", plan: "premium" }` | off                          |

Users who pass no rule are simply off. There is no hidden "everyone else"
default.

### "Everyone else" gets a smaller rollout

```text
Rule 1:  country is IN      rollout 100%
Rule 2:  (no conditions)    rollout 10%
```

An Indian user passes rule 1 and is on. Anyone else skips rule 1, then rule 2
matches everyone, so 10% of them are on.

### Falling through to the next rule

```text
Rule 1:  country is IN      rollout 10%
Rule 2:  (no conditions)    rollout 50%
```

`user_1` is in India, bucket 32. Rule 1 matches but 32 is not below 10, so they
miss it. They are **not** turned away: rule 2 matches everyone and 32 is below
50, so they pass rule 2 and are **on**.

Because every rule uses the **same** bucket, a later rule with a smaller
percentage can never rescue a user an earlier rule missed. Only a larger
percentage can.

### A multivariate experiment

Variants: `control 50`, `blue 50`.

```text
Rule 1:  plan is internal   rollout 100%   always serve blue
Rule 2:  (no conditions)    rollout 20%    split by the variants
```

- An internal user passes rule 1 and always gets `blue`.
- Of everyone else, 20% pass rule 2 and are split about 50/50 between `control`
  and `blue`.
- The other 80% pass no rule: `enabled: false`, `variant: null`.

## 8. If a flag isn't doing what you expect

Check these in order:

1.  **Is the flag switched on?** A flag that is off is off for everyone.
2.  **Is the rule's rollout above 0%?** New flags start at 0% on purpose.
3.  **Is the rule turned on?** Turned-off rules are skipped.
4.  **Do the user's properties match?** A missing property or the wrong type
    (`"19"` instead of `19`) means no match.
5.  **Is the order right?** The first rule a user passes wins, so put specific
    rules above broad ones.
6.  **Did a variant disappear?** If a rule forced a variant and you later deleted
    that variant, the rule stops forcing it and splits by the variants'
    percentages instead.
7.  **Do the variant percentages add up to 100?** If they add up to less, some
    users land in a gap and get `enabled: false` with no variant.

## 9. Where this lives in the code

| What                                      | File                                             |
| ----------------------------------------- | ------------------------------------------------ |
| The HTTP route (loads data, calls engine) | `apps/api/src/modules/evaluate/evaluate-flag.ts` |
| The engine itself (no database, no HTTP)  | `apps/api/src/modules/evaluate/evaluate.ts`      |
| Tests for all the rules above             | `apps/api/tests/unit/evaluate/evaluate.test.ts`  |

The engine is a plain function: you give it a flag, its rules, its variants and
the user, and it gives back the answer. It never touches the database, which is
why it is easy to test. The route's only job is to load that data first.
