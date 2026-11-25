import { describe, expect, it } from "vitest";

import {
  evaluateFlag,
  getBucket,
  matchesCondition,
  type EvaluableCondition,
  type EvaluableRule,
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
  const flag = { key: "checkout", enabled: true };

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
