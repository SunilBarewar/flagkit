import { describe, expect, it } from "vitest";

import { evaluateFlag } from "@/modules/evaluate/evaluate.ts";

describe("evaluateFlag", () => {
  it("is off when the flag is disabled", () => {
    expect(evaluateFlag({ key: "checkout", enabled: false })).toEqual({
      key: "checkout",
      value: false,
      reason: "DISABLED",
    });
  });

  it("is on when the flag is enabled", () => {
    expect(evaluateFlag({ key: "checkout", enabled: true })).toEqual({
      key: "checkout",
      value: true,
      reason: "ENABLED",
    });
  });
});
