import { describe, expect, it } from "vitest";

import { evaluateFlag, getBucket } from "@/modules/evaluate/evaluate.ts";

const context = (userId: string) => ({ userId, properties: {} });

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

describe("evaluateFlag", () => {
  const flag = { key: "checkout", enabled: true, rolloutPercentage: 100 };

  it("is off for everyone when the flag is disabled, even at 100%", () => {
    expect(evaluateFlag({ ...flag, enabled: false }, context("user_1"))).toEqual({
      key: "checkout",
      enabled: false,
    });
  });

  it("is on for everyone at 100%", () => {
    for (let i = 0; i < 200; i++) {
      expect(evaluateFlag(flag, context(`user_${i}`)).enabled).toBe(true);
    }
  });

  it("is off for everyone at 0%", () => {
    for (let i = 0; i < 200; i++) {
      expect(evaluateFlag({ ...flag, rolloutPercentage: 0 }, context(`user_${i}`)).enabled).toBe(
        false,
      );
    }
  });

  it("enables a user whose bucket is below the percentage", () => {
    // user_1 is in bucket 32 for this flag.
    expect(evaluateFlag({ ...flag, rolloutPercentage: 33 }, context("user_1")).enabled).toBe(true);
    expect(evaluateFlag({ ...flag, rolloutPercentage: 32 }, context("user_1")).enabled).toBe(false);
  });

  it("reaches roughly the requested share of users", () => {
    let on = 0;
    for (let i = 0; i < 10_000; i++) {
      if (evaluateFlag({ ...flag, rolloutPercentage: 20 }, context(`user_${i}`)).enabled) on++;
    }
    expect(on).toBeGreaterThan(1800);
    expect(on).toBeLessThan(2200);
  });

  it("only adds users when the percentage goes up", () => {
    for (let i = 0; i < 500; i++) {
      const at20 = evaluateFlag({ ...flag, rolloutPercentage: 20 }, context(`user_${i}`)).enabled;
      const at50 = evaluateFlag({ ...flag, rolloutPercentage: 50 }, context(`user_${i}`)).enabled;
      if (at20) expect(at50).toBe(true);
    }
  });
});
