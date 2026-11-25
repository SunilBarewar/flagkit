import { describe, expect, it } from "vitest";

import {
  evaluateFlag,
  explainEvaluation,
  getBucket,
  getVariantBucket,
  matchesCondition,
  pickVariant,
  type EvaluableCondition,
  type EvaluableRule,
  type EvaluableVariant,
} from "@/modules/evaluate/evaluate.ts";

const context = (userId: string, properties: Record<string, string | number | boolean> = {}) => ({
  userId,
  properties,
});

describe("getBucket", () => {
  // Pinned values: an SDK in another language must compute the same buckets.
  it("matches the known vectors", () => {
    expect(getBucket("user_1", "checkout")).toBe(32);
    expect(getBucket("user_2", "checkout")).toBe(86);
    expect(getBucket("user_1", "other_flag")).toBe(74);
  });

  it("is stable for the same user and flag", () => {
    expect(getBucket("user_1", "checkout")).toBe(getBucket("user_1", "checkout"));
  });

  it("is always between 0 and 99", () => {
    for (let i = 0; i < 1000; i++) {
      const bucket = getBucket(`user_${i}`, "checkout");
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(100);
    }
  });

  it("spreads users evenly across the buckets", () => {
    const counts = Array.from({ length: 100 }, () => 0);
    for (let i = 0; i < 100_000; i++) counts[getBucket(`user_${i}`, "checkout")]!++;

    // 1,000 per bucket on average. Allow a generous margin so this never flakes.
    for (const count of counts) {
      expect(count).toBeGreaterThan(800);
      expect(count).toBeLessThan(1200);
    }
  });
});

const rule = (patch: Partial<EvaluableRule> = {}): EvaluableRule => ({
  enabled: true,
  rolloutPercentage: 100,
  conditions: [],
  ...patch,
});

describe("evaluateFlag", () => {
  const flag = { key: "checkout", enabled: true, type: "boolean" as const };

  it("is off for everyone when the flag is disabled, even at 100%", () => {
    expect(evaluateFlag({ ...flag, enabled: false }, [rule()], context("user_1"))).toEqual({
      key: "checkout",
      enabled: false,
    });
  });

  it("is on for everyone with a rule that has no conditions at 100%", () => {
    for (let i = 0; i < 200; i++) {
      expect(evaluateFlag(flag, [rule()], context(`user_${i}`)).enabled).toBe(true);
    }
  });

  it("is off for everyone at 0%, which is what a new flag's default rule does", () => {
    for (let i = 0; i < 200; i++) {
      const rules = [rule({ rolloutPercentage: 0 })];
      expect(evaluateFlag(flag, rules, context(`user_${i}`)).enabled).toBe(false);
    }
  });

  it("enables a user whose bucket is below the percentage", () => {
    // user_1 is in bucket 32 for this flag.
    expect(evaluateFlag(flag, [rule({ rolloutPercentage: 33 })], context("user_1")).enabled).toBe(
      true,
    );
    expect(evaluateFlag(flag, [rule({ rolloutPercentage: 32 })], context("user_1")).enabled).toBe(
      false,
    );
  });

  it("reaches roughly the requested share of users", () => {
    let on = 0;
    for (let i = 0; i < 10_000; i++) {
      if (evaluateFlag(flag, [rule({ rolloutPercentage: 20 })], context(`user_${i}`)).enabled) on++;
    }
    expect(on).toBeGreaterThan(1800);
    expect(on).toBeLessThan(2200);
  });

  it("only adds users when the percentage goes up", () => {
    for (let i = 0; i < 500; i++) {
      const at20 = evaluateFlag(flag, [rule({ rolloutPercentage: 20 })], context(`user_${i}`));
      const at50 = evaluateFlag(flag, [rule({ rolloutPercentage: 50 })], context(`user_${i}`));
      if (at20.enabled) expect(at50.enabled).toBe(true);
    }
  });

  it("is off when the flag has no rules passed", () => {
    expect(evaluateFlag(flag, [], context("user_1")).enabled).toBe(false);
  });

  describe("targeting", () => {
    const india: EvaluableCondition = { attribute: "country", operator: "equals", value: "IN" };
    const premium: EvaluableCondition = { attribute: "plan", operator: "equals", value: "premium" };

    it("only enables users who match every condition of a rule", () => {
      const rules = [rule({ conditions: [india, premium] })];

      expect(
        evaluateFlag(flag, rules, context("u", { country: "IN", plan: "premium" })).enabled,
      ).toBe(true);
      expect(evaluateFlag(flag, rules, context("u", { country: "IN", plan: "free" })).enabled).toBe(
        false,
      );
      expect(evaluateFlag(flag, rules, context("u", { country: "IN" })).enabled).toBe(false);
    });

    it("gives users who pass no rule the disabled result, with no fallback rollout", () => {
      const rules = [rule({ conditions: [india] })];

      expect(evaluateFlag(flag, rules, context("u", { country: "US" })).enabled).toBe(false);
      expect(evaluateFlag(flag, rules, context("u")).enabled).toBe(false);
    });

    it("treats several rules as alternatives", () => {
      const rules = [
        rule({ conditions: [india] }),
        rule({ conditions: [{ attribute: "country", operator: "equals", value: "US" }] }),
      ];

      expect(evaluateFlag(flag, rules, context("u", { country: "US" })).enabled).toBe(true);
    });

    it("falls through to a later rule when the user misses an earlier rule's rollout", () => {
      // user_1 is in bucket 32: outside the first rule's 10%, inside the second's 50%.
      const rules = [
        rule({ conditions: [india], rolloutPercentage: 10 }),
        rule({ rolloutPercentage: 50 }),
      ];

      expect(evaluateFlag(flag, rules, context("user_1", { country: "IN" })).enabled).toBe(true);
    });

    it("never lets a later rule with a smaller percentage add users", () => {
      // user_1 misses 10% and so also misses 5%.
      const rules = [rule({ rolloutPercentage: 10 }), rule({ rolloutPercentage: 5 })];

      expect(evaluateFlag(flag, rules, context("user_1")).enabled).toBe(false);
    });

    it("skips disabled rules", () => {
      expect(evaluateFlag(flag, [rule({ enabled: false })], context("user_1")).enabled).toBe(false);
    });
  });
});

describe("matchesCondition", () => {
  const check = (
    operator: EvaluableCondition["operator"],
    value: unknown,
    property: string | number | boolean | undefined,
  ) =>
    matchesCondition(
      { attribute: "p", operator, value },
      property === undefined ? {} : { p: property },
    );

  it("compares with equals and not_equals", () => {
    expect(check("equals", "IN", "IN")).toBe(true);
    expect(check("equals", "IN", "US")).toBe(false);
    expect(check("equals", 1, "1")).toBe(false);
    expect(check("not_equals", "IN", "US")).toBe(true);
    expect(check("not_equals", "IN", "IN")).toBe(false);
  });

  it("checks list membership with in and not_in", () => {
    expect(check("in", ["IN", "US"], "US")).toBe(true);
    expect(check("in", ["IN", "US"], "UK")).toBe(false);
    expect(check("not_in", ["IN", "US"], "UK")).toBe(true);
    expect(check("not_in", ["IN", "US"], "IN")).toBe(false);
  });

  it("compares numbers with greater_than and less_than", () => {
    expect(check("greater_than", 18, 19)).toBe(true);
    expect(check("greater_than", 18, 18)).toBe(false);
    expect(check("less_than", 60, 59)).toBe(true);
    expect(check("less_than", 60, 60)).toBe(false);
  });

  it("looks for text with contains", () => {
    expect(check("contains", "gmail.com", "a@gmail.com")).toBe(true);
    expect(check("contains", "gmail.com", "a@yahoo.com")).toBe(false);
  });

  it("never matches a property the user doesn't have, even for the negative operators", () => {
    expect(check("equals", "IN", undefined)).toBe(false);
    expect(check("not_equals", "IN", undefined)).toBe(false);
    expect(check("not_in", ["IN"], undefined)).toBe(false);
  });

  it("never matches a property of the wrong type", () => {
    expect(check("greater_than", 18, "19")).toBe(false);
    expect(check("less_than", 60, "59")).toBe(false);
    expect(check("contains", "a", 5)).toBe(false);
  });
});

describe("getVariantBucket", () => {
  // Pinned values: an SDK in another language must compute the same buckets.
  it("matches the known vectors", () => {
    expect(getVariantBucket("user_1", "checkout")).toBe(69);
    expect(getVariantBucket("user_2", "checkout")).toBe(95);
    expect(getVariantBucket("user_1", "other_flag")).toBe(49);
  });

  it("is independent of the rollout bucket", () => {
    // Among users the 20% rollout lets in (rollout bucket 0-19), variant buckets still spread out.
    const variantBuckets = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      if (getBucket(`user_${i}`, "checkout") < 20) {
        variantBuckets.add(Math.floor(getVariantBucket(`user_${i}`, "checkout") / 10));
      }
    }
    expect(variantBuckets.size).toBe(10);
  });
});

describe("pickVariant", () => {
  const variant = (key: string, rolloutPercentage: number): EvaluableVariant => ({
    key,
    rolloutPercentage,
    payload: null,
  });
  const variants = [variant("control", 50), variant("blue", 25), variant("green", 25)];

  it("maps buckets to the slices of the percentages", () => {
    expect(pickVariant(variants, 0)?.key).toBe("control");
    expect(pickVariant(variants, 49)?.key).toBe("control");
    expect(pickVariant(variants, 50)?.key).toBe("blue");
    expect(pickVariant(variants, 74)?.key).toBe("blue");
    expect(pickVariant(variants, 75)?.key).toBe("green");
    expect(pickVariant(variants, 99)?.key).toBe("green");
  });

  it("skips variants at 0%", () => {
    expect(pickVariant([variant("a", 0), variant("b", 100)], 0)?.key).toBe("b");
  });

  it("returns nothing for buckets past percentages that add up to less than 100", () => {
    expect(pickVariant([variant("a", 40)], 39)?.key).toBe("a");
    expect(pickVariant([variant("a", 40)], 40)).toBeUndefined();
  });
});

describe("evaluateFlag for a multivariate flag", () => {
  const flag = { key: "checkout", enabled: true, type: "multivariate" as const };
  const variants: EvaluableVariant[] = [
    { key: "control", rolloutPercentage: 50, payload: null },
    { key: "blue", rolloutPercentage: 50, payload: { theme: "blue" } },
  ];
  const everyone = (patch: Partial<EvaluableRule> = {}): EvaluableRule => ({
    enabled: true,
    rolloutPercentage: 100,
    conditions: [],
    ...patch,
  });
  const off = { key: "checkout", enabled: false, variant: null, payload: null };

  it("returns no variant when the flag is disabled", () => {
    expect(evaluateFlag({ ...flag, enabled: false }, [everyone()], context("u"), variants)).toEqual(
      off,
    );
  });

  it("returns no variant to a user who passes no rule", () => {
    expect(
      evaluateFlag(flag, [everyone({ rolloutPercentage: 0 })], context("u"), variants),
    ).toEqual(off);
    expect(evaluateFlag(flag, [], context("u"), variants)).toEqual(off);
  });

  it("serves a rule's forced variant with its payload", () => {
    const rules = [everyone({ variantKey: "blue" })];

    for (let i = 0; i < 100; i++) {
      expect(evaluateFlag(flag, rules, context(`user_${i}`), variants)).toEqual({
        key: "checkout",
        enabled: true,
        variant: "blue",
        payload: { theme: "blue" },
      });
    }
  });

  it("splits users who pass a rule by the variants' percentages", () => {
    const counts: Record<string, number> = { control: 0, blue: 0 };
    for (let i = 0; i < 10_000; i++) {
      const result = evaluateFlag(flag, [everyone()], context(`user_${i}`), variants);
      counts[result.variant!]!++;
    }

    expect(counts.control).toBeGreaterThan(4500);
    expect(counts.control).toBeLessThan(5500);
  });

  it("keeps the same variant for the same user", () => {
    for (let i = 0; i < 200; i++) {
      const first = evaluateFlag(flag, [everyone()], context(`user_${i}`), variants);
      const again = evaluateFlag(flag, [everyone()], context(`user_${i}`), variants);
      expect(again).toEqual(first);
    }
  });

  it("still splits evenly among the users a partial rollout lets in", () => {
    const counts: Record<string, number> = { control: 0, blue: 0 };
    for (let i = 0; i < 20_000; i++) {
      const result = evaluateFlag(
        flag,
        [everyone({ rolloutPercentage: 20 })],
        context(`user_${i}`),
        variants,
      );
      if (result.variant) counts[result.variant]!++;
    }

    const total = counts.control! + counts.blue!;
    expect(total).toBeGreaterThan(3600);
    expect(total).toBeLessThan(4400);
    expect(counts.control! / total).toBeGreaterThan(0.45);
    expect(counts.control! / total).toBeLessThan(0.55);
  });

  it("uses the variant of the first rule the user passes", () => {
    const internal: EvaluableCondition = {
      attribute: "plan",
      operator: "equals",
      value: "internal",
    };
    const rules = [
      everyone({ conditions: [internal], variantKey: "blue" }),
      everyone({ variantKey: "control" }),
    ];

    expect(evaluateFlag(flag, rules, context("u", { plan: "internal" }), variants).variant).toBe(
      "blue",
    );
    expect(evaluateFlag(flag, rules, context("u", { plan: "free" }), variants).variant).toBe(
      "control",
    );
  });

  it("falls through to a later rule's variant when the user misses a rollout", () => {
    // user_1 is in bucket 32: outside the first rule's 10%, inside the second's 100%.
    const rules = [
      everyone({ rolloutPercentage: 10, variantKey: "blue" }),
      everyone({ variantKey: "control" }),
    ];

    expect(evaluateFlag(flag, rules, context("user_1"), variants).variant).toBe("control");
  });

  it("returns no variant when percentages leave the user's bucket uncovered", () => {
    // user_2's variant bucket is 95, past a single variant at 50%.
    const partial: EvaluableVariant[] = [{ key: "only", rolloutPercentage: 50, payload: null }];

    expect(evaluateFlag(flag, [everyone()], context("user_2"), partial)).toEqual(off);
  });

  it("returns no variant when a rule forces a variant that is gone", () => {
    expect(
      evaluateFlag(flag, [everyone({ variantKey: "deleted" })], context("u"), variants),
    ).toEqual(off);
  });

  it("leaves boolean flags without variant fields", () => {
    const boolean = { key: "checkout", enabled: true, type: "boolean" as const };

    expect(evaluateFlag(boolean, [everyone()], context("u"))).toEqual({
      key: "checkout",
      enabled: true,
    });
  });
});

describe("explainEvaluation", () => {
  const boolFlag = { key: "checkout", enabled: true, type: "boolean" as const };
  const mvFlag = { key: "checkout", enabled: true, type: "multivariate" as const };
  const rule = (patch: Partial<EvaluableRule> = {}): EvaluableRule => ({
    enabled: true,
    rolloutPercentage: 100,
    conditions: [],
    ...patch,
  });
  const variants: EvaluableVariant[] = [
    { key: "control", rolloutPercentage: 50, payload: null },
    { key: "blue", rolloutPercentage: 50, payload: { theme: "blue" } },
  ];
  const india: EvaluableCondition = { attribute: "country", operator: "equals", value: "IN" };

  it("always agrees with evaluateFlag", () => {
    const rulesets: EvaluableRule[][] = [
      [],
      [rule({ rolloutPercentage: 0 })],
      [rule({ conditions: [india], rolloutPercentage: 30 }), rule({ rolloutPercentage: 60 })],
      [rule({ enabled: false }), rule({ variantKey: "blue", rolloutPercentage: 40 })],
    ];

    for (const flag of [boolFlag, mvFlag, { ...mvFlag, enabled: false }]) {
      for (const rules of rulesets) {
        for (let i = 0; i < 100; i++) {
          const ctx = context(`user_${i}`, i % 2 ? { country: "IN" } : {});
          expect(explainEvaluation(flag, rules, ctx, variants).result).toEqual(
            evaluateFlag(flag, rules, ctx, variants),
          );
        }
      }
    }
  });

  it("reports the user's buckets", () => {
    const { trace } = explainEvaluation(mvFlag, [rule()], context("user_1"), variants);

    expect(trace.bucket).toBe(32);
    expect(trace.variantBucket).toBe(69);
    expect(trace.variantSource).toBe("split");
    expect(trace.reason).toBe("passed");
  });

  it("explains why each rule did or didn't pass", () => {
    const rules = [
      rule({ enabled: false }),
      rule({ conditions: [india] }),
      // user_1 is in bucket 32, outside 10%.
      rule({ rolloutPercentage: 10 }),
      rule({ rolloutPercentage: 50 }),
      rule(),
    ];
    const { trace } = explainEvaluation(boolFlag, rules, context("user_1", { country: "US" }));

    expect(trace.rules.map((r) => r.status)).toEqual([
      "turned_off",
      "conditions_not_matched",
      "missed_rollout",
      "passed",
      "not_reached",
    ]);
  });

  it("shows what the user sent for each condition and whether it matched", () => {
    const { trace } = explainEvaluation(
      boolFlag,
      [rule({ conditions: [india, { attribute: "plan", operator: "equals", value: "pro" }] })],
      context("u", { country: "IN" }),
    );

    expect(trace.rules[0]!.conditions).toEqual([
      { attribute: "country", operator: "equals", value: "IN", actual: "IN", matched: true },
      { attribute: "plan", operator: "equals", value: "pro", actual: null, matched: false },
    ]);
  });

  it("marks every rule as not reached when the flag is disabled", () => {
    const { result, trace } = explainEvaluation(
      { ...boolFlag, enabled: false },
      [rule()],
      context("u"),
    );

    expect(result.enabled).toBe(false);
    expect(trace.reason).toBe("flag_disabled");
    expect(trace.rules[0]!.status).toBe("not_reached");
  });

  it("says when no rule passed", () => {
    expect(
      explainEvaluation(boolFlag, [rule({ rolloutPercentage: 0 })], context("u")).trace.reason,
    ).toBe("no_rule_passed");
  });

  it("reports a forced variant without a variant bucket", () => {
    const { trace } = explainEvaluation(
      mvFlag,
      [rule({ variantKey: "blue" })],
      context("u"),
      variants,
    );

    expect(trace.variantSource).toBe("forced");
    expect(trace.variantBucket).toBeNull();
  });

  it("says when a rule passed but no variant could be chosen", () => {
    const { result, trace } = explainEvaluation(
      mvFlag,
      [rule({ variantKey: "deleted" })],
      context("u"),
      variants,
    );

    expect(result.enabled).toBe(false);
    expect(trace.reason).toBe("no_variant");
  });
});
