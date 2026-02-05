import { describe, expect, it } from "vitest";
import { evaluateFlag } from "../evaluator";
import type { SnapshotFlag, SnapshotSegment } from "../types";

function createFlag(overrides: Partial<SnapshotFlag> = {}): SnapshotFlag {
  return {
    key: "test-flag",
    type: "boolean",
    enabled: true,
    variations: {
      on: { key: "on", value: true },
      off: { key: "off", value: false },
    },
    defaultVariationKey: "on",
    offVariationKey: "off",
    targets: [],
    ...overrides,
  };
}

describe("evaluateFlag", () => {
  describe("disabled flags", () => {
    it("returns off variation when flag is disabled", () => {
      const flag = createFlag({ enabled: false });
      expect(evaluateFlag(flag, {}, {})).toBe(false);
    });

    it("returns off variation regardless of targets", () => {
      const flag = createFlag({
        enabled: false,
        targets: [
          {
            type: "rule",
            variationKey: "on",
            sortOrder: 0,
            conditions: [
              {
                contextKind: "user",
                attributeKey: "plan",
                operator: "equals",
                value: "pro",
              },
            ],
          },
        ],
      });
      expect(evaluateFlag(flag, { user: { plan: "pro" } }, {})).toBe(false);
    });
  });

  describe("enabled flags with no targets", () => {
    it("returns default variation", () => {
      const flag = createFlag({ enabled: true });
      expect(evaluateFlag(flag, {}, {})).toBe(true);
    });

    it("returns string default variation", () => {
      const flag = createFlag({
        type: "string",
        variations: {
          control: { key: "control", value: "control" },
          variant: { key: "variant", value: "variant-a" },
        },
        defaultVariationKey: "control",
        offVariationKey: "control",
      });
      expect(evaluateFlag(flag, {}, {})).toBe("control");
    });

    it("returns number default variation", () => {
      const flag = createFlag({
        type: "number",
        variations: {
          low: { key: "low", value: 10 },
          high: { key: "high", value: 100 },
        },
        defaultVariationKey: "low",
        offVariationKey: "low",
      });
      expect(evaluateFlag(flag, {}, {})).toBe(10);
    });
  });

  describe("individual targeting", () => {
    it("matches individual target by attribute", () => {
      const flag = createFlag({
        targets: [
          {
            type: "individual",
            variationKey: "off",
            sortOrder: 0,
            contextKind: "user",
            attributeKey: "userId",
            attributeValue: "user-123",
          },
        ],
      });
      expect(evaluateFlag(flag, { user: { userId: "user-123" } }, {})).toBe(
        false
      );
    });

    it("does not match different user", () => {
      const flag = createFlag({
        targets: [
          {
            type: "individual",
            variationKey: "off",
            sortOrder: 0,
            contextKind: "user",
            attributeKey: "userId",
            attributeValue: "user-123",
          },
        ],
      });
      expect(evaluateFlag(flag, { user: { userId: "user-456" } }, {})).toBe(
        true
      );
    });

    it("does not match when context kind is missing", () => {
      const flag = createFlag({
        targets: [
          {
            type: "individual",
            variationKey: "off",
            sortOrder: 0,
            contextKind: "user",
            attributeKey: "userId",
            attributeValue: "user-123",
          },
        ],
      });
      expect(evaluateFlag(flag, { device: { userId: "user-123" } }, {})).toBe(
        true
      );
    });
  });

  describe("rule targeting", () => {
    it("matches equals operator", () => {
      const flag = createFlag({
        targets: [
          {
            type: "rule",
            variationKey: "off",
            sortOrder: 0,
            conditions: [
              {
                contextKind: "user",
                attributeKey: "plan",
                operator: "equals",
                value: "pro",
              },
            ],
          },
        ],
      });
      expect(evaluateFlag(flag, { user: { plan: "pro" } }, {})).toBe(false);
      expect(evaluateFlag(flag, { user: { plan: "free" } }, {})).toBe(true);
    });

    it("matches not_equals operator", () => {
      const flag = createFlag({
        targets: [
          {
            type: "rule",
            variationKey: "off",
            sortOrder: 0,
            conditions: [
              {
                contextKind: "user",
                attributeKey: "plan",
                operator: "not_equals",
                value: "pro",
              },
            ],
          },
        ],
      });
      expect(evaluateFlag(flag, { user: { plan: "free" } }, {})).toBe(false);
      expect(evaluateFlag(flag, { user: { plan: "pro" } }, {})).toBe(true);
    });

    it("matches contains operator on strings", () => {
      const flag = createFlag({
        targets: [
          {
            type: "rule",
            variationKey: "off",
            sortOrder: 0,
            conditions: [
              {
                contextKind: "user",
                attributeKey: "email",
                operator: "contains",
                value: "@gradual.so",
              },
            ],
          },
        ],
      });
      expect(
        evaluateFlag(flag, { user: { email: "eli@gradual.so" } }, {})
      ).toBe(false);
      expect(evaluateFlag(flag, { user: { email: "eli@other.com" } }, {})).toBe(
        true
      );
    });

    it("matches starts_with operator", () => {
      const flag = createFlag({
        targets: [
          {
            type: "rule",
            variationKey: "off",
            sortOrder: 0,
            conditions: [
              {
                contextKind: "location",
                attributeKey: "country",
                operator: "starts_with",
                value: "US",
              },
            ],
          },
        ],
      });
      expect(evaluateFlag(flag, { location: { country: "US-CA" } }, {})).toBe(
        false
      );
      expect(evaluateFlag(flag, { location: { country: "UK-LDN" } }, {})).toBe(
        true
      );
    });

    it("matches ends_with operator", () => {
      const flag = createFlag({
        targets: [
          {
            type: "rule",
            variationKey: "off",
            sortOrder: 0,
            conditions: [
              {
                contextKind: "user",
                attributeKey: "email",
                operator: "ends_with",
                value: ".com",
              },
            ],
          },
        ],
      });
      expect(evaluateFlag(flag, { user: { email: "eli@test.com" } }, {})).toBe(
        false
      );
      expect(evaluateFlag(flag, { user: { email: "eli@test.io" } }, {})).toBe(
        true
      );
    });

    it("matches greater_than operator", () => {
      const flag = createFlag({
        targets: [
          {
            type: "rule",
            variationKey: "off",
            sortOrder: 0,
            conditions: [
              {
                contextKind: "user",
                attributeKey: "age",
                operator: "greater_than",
                value: 18,
              },
            ],
          },
        ],
      });
      expect(evaluateFlag(flag, { user: { age: 25 } }, {})).toBe(false);
      expect(evaluateFlag(flag, { user: { age: 18 } }, {})).toBe(true);
      expect(evaluateFlag(flag, { user: { age: 10 } }, {})).toBe(true);
    });

    it("matches less_than operator", () => {
      const flag = createFlag({
        targets: [
          {
            type: "rule",
            variationKey: "off",
            sortOrder: 0,
            conditions: [
              {
                contextKind: "user",
                attributeKey: "score",
                operator: "less_than",
                value: 50,
              },
            ],
          },
        ],
      });
      expect(evaluateFlag(flag, { user: { score: 30 } }, {})).toBe(false);
      expect(evaluateFlag(flag, { user: { score: 50 } }, {})).toBe(true);
    });

    it("matches in operator", () => {
      const flag = createFlag({
        targets: [
          {
            type: "rule",
            variationKey: "off",
            sortOrder: 0,
            conditions: [
              {
                contextKind: "location",
                attributeKey: "country",
                operator: "in",
                value: ["US", "UK", "CA"],
              },
            ],
          },
        ],
      });
      expect(evaluateFlag(flag, { location: { country: "US" } }, {})).toBe(
        false
      );
      expect(evaluateFlag(flag, { location: { country: "DE" } }, {})).toBe(
        true
      );
    });

    it("matches not_in operator", () => {
      const flag = createFlag({
        targets: [
          {
            type: "rule",
            variationKey: "off",
            sortOrder: 0,
            conditions: [
              {
                contextKind: "location",
                attributeKey: "country",
                operator: "not_in",
                value: ["CN", "RU"],
              },
            ],
          },
        ],
      });
      expect(evaluateFlag(flag, { location: { country: "US" } }, {})).toBe(
        false
      );
      expect(evaluateFlag(flag, { location: { country: "CN" } }, {})).toBe(
        true
      );
    });

    it("matches exists operator", () => {
      const flag = createFlag({
        targets: [
          {
            type: "rule",
            variationKey: "off",
            sortOrder: 0,
            conditions: [
              {
                contextKind: "user",
                attributeKey: "betaUser",
                operator: "exists",
                value: null,
              },
            ],
          },
        ],
      });
      expect(evaluateFlag(flag, { user: { betaUser: true } }, {})).toBe(false);
      expect(evaluateFlag(flag, { user: {} }, {})).toBe(true);
    });

    it("matches not_exists operator", () => {
      const flag = createFlag({
        targets: [
          {
            type: "rule",
            variationKey: "off",
            sortOrder: 0,
            conditions: [
              {
                contextKind: "user",
                attributeKey: "banned",
                operator: "not_exists",
                value: null,
              },
            ],
          },
        ],
      });
      expect(evaluateFlag(flag, { user: {} }, {})).toBe(false);
      expect(evaluateFlag(flag, { user: { banned: true } }, {})).toBe(true);
    });

    it("requires all conditions to match (AND logic)", () => {
      const flag = createFlag({
        targets: [
          {
            type: "rule",
            variationKey: "off",
            sortOrder: 0,
            conditions: [
              {
                contextKind: "user",
                attributeKey: "plan",
                operator: "equals",
                value: "pro",
              },
              {
                contextKind: "location",
                attributeKey: "country",
                operator: "equals",
                value: "US",
              },
            ],
          },
        ],
      });
      expect(
        evaluateFlag(
          flag,
          { user: { plan: "pro" }, location: { country: "US" } },
          {}
        )
      ).toBe(false);
      expect(
        evaluateFlag(
          flag,
          { user: { plan: "pro" }, location: { country: "UK" } },
          {}
        )
      ).toBe(true);
      expect(
        evaluateFlag(
          flag,
          { user: { plan: "free" }, location: { country: "US" } },
          {}
        )
      ).toBe(true);
    });

    it("supports custom context kinds", () => {
      const flag = createFlag({
        targets: [
          {
            type: "rule",
            variationKey: "off",
            sortOrder: 0,
            conditions: [
              {
                contextKind: "company",
                attributeKey: "size",
                operator: "greater_than",
                value: 100,
              },
            ],
          },
        ],
      });
      expect(evaluateFlag(flag, { company: { size: 500 } }, {})).toBe(false);
      expect(evaluateFlag(flag, { company: { size: 50 } }, {})).toBe(true);
    });
  });

  describe("segment targeting", () => {
    it("matches segment conditions", () => {
      const segments: Record<string, SnapshotSegment> = {
        "beta-users": {
          key: "beta-users",
          conditions: [
            {
              contextKind: "user",
              attributeKey: "betaUser",
              operator: "equals",
              value: true,
            },
          ],
        },
      };

      const flag = createFlag({
        targets: [
          {
            type: "segment",
            variationKey: "off",
            sortOrder: 0,
            segmentKey: "beta-users",
          },
        ],
      });

      expect(evaluateFlag(flag, { user: { betaUser: true } }, segments)).toBe(
        false
      );
      expect(evaluateFlag(flag, { user: { betaUser: false } }, segments)).toBe(
        true
      );
    });

    it("falls through when segment not found", () => {
      const flag = createFlag({
        targets: [
          {
            type: "segment",
            variationKey: "off",
            sortOrder: 0,
            segmentKey: "nonexistent",
          },
        ],
      });
      expect(evaluateFlag(flag, {}, {})).toBe(true);
    });
  });

  describe("target priority (sortOrder)", () => {
    it("evaluates targets in sortOrder", () => {
      const flag = createFlag({
        type: "string",
        variations: {
          control: { key: "control", value: "control" },
          "variant-a": { key: "variant-a", value: "variant-a" },
          "variant-b": { key: "variant-b", value: "variant-b" },
        },
        defaultVariationKey: "control",
        offVariationKey: "control",
        targets: [
          {
            type: "individual",
            variationKey: "variant-a",
            sortOrder: 0,
            contextKind: "user",
            attributeKey: "userId",
            attributeValue: "user-1",
          },
          {
            type: "rule",
            variationKey: "variant-b",
            sortOrder: 1,
            conditions: [
              {
                contextKind: "user",
                attributeKey: "plan",
                operator: "equals",
                value: "pro",
              },
            ],
          },
        ],
      });

      expect(
        evaluateFlag(flag, { user: { userId: "user-1", plan: "pro" } }, {})
      ).toBe("variant-a");

      expect(
        evaluateFlag(flag, { user: { userId: "user-2", plan: "pro" } }, {})
      ).toBe("variant-b");

      expect(
        evaluateFlag(flag, { user: { userId: "user-2", plan: "free" } }, {})
      ).toBe("control");
    });
  });

  describe("edge cases", () => {
    it("returns undefined for unknown flag key (handled by caller)", () => {
      const flag = createFlag({
        variations: {},
        defaultVariationKey: "nonexistent",
      });
      expect(evaluateFlag(flag, {}, {})).toBeUndefined();
    });

    it("handles json flag type", () => {
      const flag = createFlag({
        type: "json",
        variations: {
          config: { key: "config", value: { theme: "dark", limit: 100 } },
        },
        defaultVariationKey: "config",
        offVariationKey: "config",
      });
      expect(evaluateFlag(flag, {}, {})).toEqual({
        theme: "dark",
        limit: 100,
      });
    });

    it("returns default when context kind is missing", () => {
      const flag = createFlag({
        targets: [
          {
            type: "rule",
            variationKey: "off",
            sortOrder: 0,
            conditions: [
              {
                contextKind: "user",
                attributeKey: "plan",
                operator: "equals",
                value: "pro",
              },
            ],
          },
        ],
      });
      expect(evaluateFlag(flag, { device: { type: "mobile" } }, {})).toBe(true);
    });
  });
});
