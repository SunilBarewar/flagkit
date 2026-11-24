import { describe, expect, it } from "vitest";

import { evaluateFlag } from "@/modules/evaluate/evaluate.ts";

describe("evaluateFlag", () => {
  it("is off when the flag is inactive, even if its default is true", () => {
    expect(evaluateFlag({ key: "checkout", isActive: false, defaultValue: true })).toEqual({
      key: "checkout",
      value: false,
      reason: "DISABLED",
    });
  });

  it("serves the default value when active", () => {
    expect(evaluateFlag({ key: "checkout", isActive: true, defaultValue: true })).toEqual({
      key: "checkout",
      value: true,
      reason: "DEFAULT",
    });
    expect(evaluateFlag({ key: "checkout", isActive: true, defaultValue: false }).value).toBe(
      false,
    );
  });
});
