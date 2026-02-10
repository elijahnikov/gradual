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
      const result = evaluateFlag(flag, {}, {});
      expect(result.value).toBe(false);
      expect(result.reasons).toEqual([{ type: "off" }]);
      expect(result.variationKey).toBe("off");
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
      const result = evaluateFlag(flag, { user: { plan: "pro" } }, {});
      expect(result.value).toBe(false);
      expect(result.reasons).toEqual([{ type: "off" }]);
    });
  });

  describe("enabled flags with no targets", () => {
    it("returns default variation", () => {
      const flag = createFlag({ enabled: true });
      const result = evaluateFlag(flag, {}, {});
      expect(result.value).toBe(true);
      expect(result.reasons).toEqual([{ type: "default" }]);
      expect(result.variationKey).toBe("on");
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
      expect(evaluateFlag(flag, {}, {}).value).toBe("control");
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
      expect(evaluateFlag(flag, {}, {}).value).toBe(10);
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
      const result = evaluateFlag(flag, { user: { userId: "user-123" } }, {});
      expect(result.value).toBe(false);
      expect(result.reasons[0]).toMatchObject({ type: "rule_match" });
      expect(result.variationKey).toBe("off");
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
      expect(
        evaluateFlag(flag, { user: { userId: "user-456" } }, {}).value
      ).toBe(true);
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
      expect(
        evaluateFlag(flag, { device: { userId: "user-123" } }, {}).value
      ).toBe(true);
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
      expect(evaluateFlag(flag, { user: { plan: "pro" } }, {}).value).toBe(
        false
      );
      expect(evaluateFlag(flag, { user: { plan: "free" } }, {}).value).toBe(
        true
      );
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
      expect(evaluateFlag(flag, { user: { plan: "free" } }, {}).value).toBe(
        false
      );
      expect(evaluateFlag(flag, { user: { plan: "pro" } }, {}).value).toBe(
        true
      );
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
        evaluateFlag(flag, { user: { email: "eli@gradual.so" } }, {}).value
      ).toBe(false);
      expect(
        evaluateFlag(flag, { user: { email: "eli@other.com" } }, {}).value
      ).toBe(true);
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
      expect(
        evaluateFlag(flag, { location: { country: "US-CA" } }, {}).value
      ).toBe(false);
      expect(
        evaluateFlag(flag, { location: { country: "UK-LDN" } }, {}).value
      ).toBe(true);
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
      expect(
        evaluateFlag(flag, { user: { email: "eli@test.com" } }, {}).value
      ).toBe(false);
      expect(
        evaluateFlag(flag, { user: { email: "eli@test.io" } }, {}).value
      ).toBe(true);
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
      expect(evaluateFlag(flag, { user: { age: 25 } }, {}).value).toBe(false);
      expect(evaluateFlag(flag, { user: { age: 18 } }, {}).value).toBe(true);
      expect(evaluateFlag(flag, { user: { age: 10 } }, {}).value).toBe(true);
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
      expect(evaluateFlag(flag, { user: { score: 30 } }, {}).value).toBe(false);
      expect(evaluateFlag(flag, { user: { score: 50 } }, {}).value).toBe(true);
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
      expect(
        evaluateFlag(flag, { location: { country: "US" } }, {}).value
      ).toBe(false);
      expect(
        evaluateFlag(flag, { location: { country: "DE" } }, {}).value
      ).toBe(true);
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
      expect(
        evaluateFlag(flag, { location: { country: "US" } }, {}).value
      ).toBe(false);
      expect(
        evaluateFlag(flag, { location: { country: "CN" } }, {}).value
      ).toBe(true);
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
      expect(evaluateFlag(flag, { user: { betaUser: true } }, {}).value).toBe(
        false
      );
      expect(evaluateFlag(flag, { user: {} }, {}).value).toBe(true);
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
      expect(evaluateFlag(flag, { user: {} }, {}).value).toBe(false);
      expect(evaluateFlag(flag, { user: { banned: true } }, {}).value).toBe(
        true
      );
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
        ).value
      ).toBe(false);
      expect(
        evaluateFlag(
          flag,
          { user: { plan: "pro" }, location: { country: "UK" } },
          {}
        ).value
      ).toBe(true);
      expect(
        evaluateFlag(
          flag,
          { user: { plan: "free" }, location: { country: "US" } },
          {}
        ).value
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
      expect(evaluateFlag(flag, { company: { size: 500 } }, {}).value).toBe(
        false
      );
      expect(evaluateFlag(flag, { company: { size: 50 } }, {}).value).toBe(
        true
      );
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

      expect(
        evaluateFlag(flag, { user: { betaUser: true } }, segments).value
      ).toBe(false);
      expect(
        evaluateFlag(flag, { user: { betaUser: false } }, segments).value
      ).toBe(true);
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
      expect(evaluateFlag(flag, {}, {}).value).toBe(true);
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
          .value
      ).toBe("variant-a");

      expect(
        evaluateFlag(flag, { user: { userId: "user-2", plan: "pro" } }, {})
          .value
      ).toBe("variant-b");

      expect(
        evaluateFlag(flag, { user: { userId: "user-2", plan: "free" } }, {})
          .value
      ).toBe("control");
    });
  });

  describe("edge cases", () => {
    it("returns undefined for unknown flag key (handled by caller)", () => {
      const flag = createFlag({
        variations: {},
        defaultVariationKey: "nonexistent",
      });
      expect(evaluateFlag(flag, {}, {}).value).toBeUndefined();
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
      expect(evaluateFlag(flag, {}, {}).value).toEqual({
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
      expect(evaluateFlag(flag, { device: { type: "mobile" } }, {}).value).toBe(
        true
      );
    });
  });

  describe("rollout targeting", () => {
    it("selects variation based on bucket value for target rollout", () => {
      const flag = createFlag({
        type: "string",
        variations: {
          control: { key: "control", value: "control" },
          variant: { key: "variant", value: "variant" },
        },
        defaultVariationKey: "control",
        offVariationKey: "control",
        targets: [
          {
            type: "rule",
            sortOrder: 0,
            conditions: [
              {
                contextKind: "user",
                attributeKey: "plan",
                operator: "equals",
                value: "pro",
              },
            ],
            rollout: {
              variations: [
                { variationKey: "control", weight: 50_000 },
                { variationKey: "variant", weight: 50_000 },
              ],
              bucketContextKind: "user",
              bucketAttributeKey: "key",
            },
          },
        ],
      });

      // Same user should always get the same result
      const result1 = evaluateFlag(
        flag,
        { user: { key: "user-123", plan: "pro" } },
        {}
      );
      const result2 = evaluateFlag(
        flag,
        { user: { key: "user-123", plan: "pro" } },
        {}
      );
      expect(result1.value).toBe(result2.value);
      expect(result1.reasons[0]).toMatchObject({ type: "rule_match" });

      // Different users may get different results, but should be deterministic
      const result3 = evaluateFlag(
        flag,
        { user: { key: "user-456", plan: "pro" } },
        {}
      );
      const result4 = evaluateFlag(
        flag,
        { user: { key: "user-456", plan: "pro" } },
        {}
      );
      expect(result3.value).toBe(result4.value);

      // Results should be one of the variations
      expect(["control", "variant"]).toContain(result1.value);
      expect(["control", "variant"]).toContain(result3.value);
    });

    it("uses single variationKey when rollout is not present", () => {
      const flag = createFlag({
        type: "string",
        variations: {
          control: { key: "control", value: "control" },
          variant: { key: "variant", value: "variant" },
        },
        defaultVariationKey: "control",
        offVariationKey: "control",
        targets: [
          {
            type: "rule",
            variationKey: "variant",
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

      expect(evaluateFlag(flag, { user: { plan: "pro" } }, {}).value).toBe(
        "variant"
      );
    });

    it("uses default rollout when no targets match", () => {
      const flag = createFlag({
        type: "string",
        variations: {
          control: { key: "control", value: "control" },
          variant: { key: "variant", value: "variant" },
        },
        offVariationKey: "control",
        targets: [],
        defaultRollout: {
          variations: [
            { variationKey: "control", weight: 50_000 },
            { variationKey: "variant", weight: 50_000 },
          ],
          bucketContextKind: "user",
          bucketAttributeKey: "key",
        },
      });

      // Same user should always get the same result
      const result1 = evaluateFlag(flag, { user: { key: "user-abc" } }, {});
      const result2 = evaluateFlag(flag, { user: { key: "user-abc" } }, {});
      expect(result1.value).toBe(result2.value);
      expect(result1.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "percentage_rollout" }),
          { type: "default" },
        ])
      );

      // Results should be one of the variations
      expect(["control", "variant"]).toContain(result1.value);
    });

    it("respects different bucket attributes", () => {
      const flag = createFlag({
        type: "string",
        variations: {
          control: { key: "control", value: "control" },
          variant: { key: "variant", value: "variant" },
        },
        defaultVariationKey: "control",
        offVariationKey: "control",
        targets: [
          {
            type: "rule",
            sortOrder: 0,
            conditions: [
              {
                contextKind: "user",
                attributeKey: "plan",
                operator: "equals",
                value: "pro",
              },
            ],
            rollout: {
              variations: [
                { variationKey: "control", weight: 50_000 },
                { variationKey: "variant", weight: 50_000 },
              ],
              bucketContextKind: "company",
              bucketAttributeKey: "id",
            },
          },
        ],
      });

      const result1 = evaluateFlag(
        flag,
        { user: { key: "user-1", plan: "pro" }, company: { id: "company-1" } },
        {}
      );
      const result2 = evaluateFlag(
        flag,
        { user: { key: "user-2", plan: "pro" }, company: { id: "company-1" } },
        {}
      );
      expect(result1.value).toBe(result2.value);
    });

    it("seed affects bucket calculation deterministically", () => {
      const flagWithSeed = createFlag({
        key: "test-flag",
        type: "string",
        variations: {
          control: { key: "control", value: "control" },
          variant: { key: "variant", value: "variant" },
        },
        offVariationKey: "control",
        targets: [],
        defaultRollout: {
          variations: [
            { variationKey: "control", weight: 50_000 },
            { variationKey: "variant", weight: 50_000 },
          ],
          bucketContextKind: "user",
          bucketAttributeKey: "key",
          seed: "my-seed",
        },
      });

      const flagWithDifferentSeed = createFlag({
        key: "test-flag",
        type: "string",
        variations: {
          control: { key: "control", value: "control" },
          variant: { key: "variant", value: "variant" },
        },
        offVariationKey: "control",
        targets: [],
        defaultRollout: {
          variations: [
            { variationKey: "control", weight: 50_000 },
            { variationKey: "variant", weight: 50_000 },
          ],
          bucketContextKind: "user",
          bucketAttributeKey: "key",
          seed: "different-seed",
        },
      });

      const result1 = evaluateFlag(
        flagWithSeed,
        { user: { key: "user-xyz" } },
        {}
      );
      const result2 = evaluateFlag(
        flagWithSeed,
        { user: { key: "user-xyz" } },
        {}
      );
      expect(result1.value).toBe(result2.value);

      expect(["control", "variant"]).toContain(result1.value);
      expect(["control", "variant"]).toContain(
        evaluateFlag(flagWithDifferentSeed, { user: { key: "user-xyz" } }, {})
          .value
      );
    });

    it("handles 100% to one variation", () => {
      const flag = createFlag({
        type: "string",
        variations: {
          control: { key: "control", value: "control" },
          variant: { key: "variant", value: "variant" },
        },
        offVariationKey: "control",
        targets: [],
        defaultRollout: {
          variations: [{ variationKey: "variant", weight: 100_000 }],
          bucketContextKind: "user",
          bucketAttributeKey: "key",
        },
      });

      // Everyone should get the variant
      expect(evaluateFlag(flag, { user: { key: "user-1" } }, {}).value).toBe(
        "variant"
      );
      expect(evaluateFlag(flag, { user: { key: "user-2" } }, {}).value).toBe(
        "variant"
      );
      expect(evaluateFlag(flag, { user: { key: "user-3" } }, {}).value).toBe(
        "variant"
      );
    });

    it("handles missing bucket attribute by using 'anonymous'", () => {
      const flag = createFlag({
        type: "string",
        variations: {
          control: { key: "control", value: "control" },
          variant: { key: "variant", value: "variant" },
        },
        offVariationKey: "control",
        targets: [],
        defaultRollout: {
          variations: [
            { variationKey: "control", weight: 50_000 },
            { variationKey: "variant", weight: 50_000 },
          ],
          bucketContextKind: "user",
          bucketAttributeKey: "key",
        },
      });

      const result1 = evaluateFlag(flag, { user: {} }, {});
      const result2 = evaluateFlag(flag, {}, {});
      expect(result1.value).toBe(result2.value);
    });

    it("distributes users to both variations with a 50/50 split", () => {
      const flag = createFlag({
        key: "distribution-test",
        type: "string",
        variations: {
          control: { key: "control", value: "control" },
          variant: { key: "variant", value: "variant" },
        },
        offVariationKey: "control",
        targets: [],
        defaultRollout: {
          variations: [
            { variationKey: "control", weight: 50_000 }, // 50%
            { variationKey: "variant", weight: 50_000 }, // 50%
          ],
          bucketContextKind: "user",
          bucketAttributeKey: "key",
        },
      });

      const results = { control: 0, variant: 0 };
      const numUsers = 100;

      for (let i = 0; i < numUsers; i++) {
        const result = evaluateFlag(flag, { user: { key: `user-${i}` } }, {})
          .value as string;
        if (result === "control" || result === "variant") {
          results[result]++;
        }
      }

      // Both variations should receive some users
      expect(results.control).toBeGreaterThan(0);
      expect(results.variant).toBeGreaterThan(0);
      expect(results.control + results.variant).toBe(numUsers);
    });

    it("handles three-way split with valid distribution", () => {
      const flag = createFlag({
        key: "three-way-split",
        type: "string",
        variations: {
          control: { key: "control", value: "control" },
          "variant-a": { key: "variant-a", value: "variant-a" },
          "variant-b": { key: "variant-b", value: "variant-b" },
        },
        offVariationKey: "control",
        targets: [],
        defaultRollout: {
          variations: [
            { variationKey: "control", weight: 33_334 },
            { variationKey: "variant-a", weight: 33_333 },
            { variationKey: "variant-b", weight: 33_333 },
          ],
          bucketContextKind: "user",
          bucketAttributeKey: "key",
        },
      });

      for (let i = 0; i < 20; i++) {
        const result = evaluateFlag(flag, { user: { key: `user-${i}` } }, {});
        expect(["control", "variant-a", "variant-b"]).toContain(result.value);
      }

      const result1 = evaluateFlag(
        flag,
        { user: { key: "consistent-user" } },
        {}
      );
      const result2 = evaluateFlag(
        flag,
        { user: { key: "consistent-user" } },
        {}
      );
      expect(result1.value).toBe(result2.value);
    });

    it("segment target with rollout", () => {
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
        type: "string",
        variations: {
          control: { key: "control", value: "control" },
          variant: { key: "variant", value: "variant" },
        },
        defaultVariationKey: "control",
        offVariationKey: "control",
        targets: [
          {
            type: "segment",
            sortOrder: 0,
            segmentKey: "beta-users",
            rollout: {
              variations: [
                { variationKey: "control", weight: 50_000 },
                { variationKey: "variant", weight: 50_000 },
              ],
              bucketContextKind: "user",
              bucketAttributeKey: "key",
            },
          },
        ],
      });

      // Beta users get rollout
      const result1 = evaluateFlag(
        flag,
        { user: { key: "user-1", betaUser: true } },
        segments
      );
      expect(["control", "variant"]).toContain(result1.value);

      // Non-beta users get default
      expect(
        evaluateFlag(
          flag,
          { user: { key: "user-1", betaUser: false } },
          segments
        ).value
      ).toBe("control");
    });

    it("individual target with rollout", () => {
      const flag = createFlag({
        type: "string",
        variations: {
          control: { key: "control", value: "control" },
          variant: { key: "variant", value: "variant" },
        },
        defaultVariationKey: "control",
        offVariationKey: "control",
        targets: [
          {
            type: "individual",
            sortOrder: 0,
            contextKind: "user",
            attributeKey: "email",
            attributeValue: "beta@example.com",
            rollout: {
              variations: [
                { variationKey: "control", weight: 50_000 },
                { variationKey: "variant", weight: 50_000 },
              ],
              bucketContextKind: "user",
              bucketAttributeKey: "key",
            },
          },
        ],
      });

      // Targeted user gets rollout
      const result1 = evaluateFlag(
        flag,
        { user: { key: "user-1", email: "beta@example.com" } },
        {}
      );
      expect(["control", "variant"]).toContain(result1.value);

      // Other users get default
      expect(
        evaluateFlag(
          flag,
          { user: { key: "user-1", email: "other@example.com" } },
          {}
        ).value
      ).toBe("control");
    });
  });

  describe("matchedTargetName", () => {
    it("includes target name when target matches", () => {
      const flag = createFlag({
        targets: [
          {
            type: "rule",
            variationKey: "on",
            sortOrder: 0,
            name: "Beta Users Rule",
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
      const result = evaluateFlag(flag, { user: { plan: "pro" } }, {});
      expect(result.reasons[0]).toMatchObject({ type: "rule_match" });
      expect(result.matchedTargetName).toBe("Beta Users Rule");
    });

    it("does not include target name when no target matches", () => {
      const flag = createFlag({ enabled: true, targets: [] });
      const result = evaluateFlag(flag, {}, {});
      expect(result.reasons).toEqual([{ type: "default" }]);
      expect(result.matchedTargetName).toBeUndefined();
    });

    it("does not include target name when flag is disabled", () => {
      const flag = createFlag({ enabled: false });
      const result = evaluateFlag(flag, { user: { plan: "pro" } }, {});
      expect(result.reasons).toEqual([{ type: "off" }]);
      expect(result.matchedTargetName).toBeUndefined();
    });

    it("includes target name for individual targets", () => {
      const flag = createFlag({
        targets: [
          {
            type: "individual",
            variationKey: "on",
            sortOrder: 0,
            name: "VIP User",
            contextKind: "user",
            attributeKey: "id",
            attributeValue: "user-123",
          },
        ],
      });
      const result = evaluateFlag(flag, { user: { id: "user-123" } }, {});
      expect(result.reasons[0]).toMatchObject({ type: "rule_match" });
      expect(result.matchedTargetName).toBe("VIP User");
    });

    it("returns undefined target name when target has no name", () => {
      const flag = createFlag({
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
      const result = evaluateFlag(flag, { user: { plan: "pro" } }, {});
      expect(result.reasons[0]).toMatchObject({ type: "rule_match" });
      expect(result.matchedTargetName).toBeUndefined();
    });
  });
});
