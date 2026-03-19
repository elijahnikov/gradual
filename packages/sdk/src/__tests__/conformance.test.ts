/**
 * Conformance tests — loads shared fixtures from gradual-sdk-spec.
 *
 * These tests ensure the TypeScript evaluator produces identical results
 * to the canonical spec fixtures used by all Gradual SDK implementations
 * (Python, Go, Rust). Any change here must be reflected in the spec repo.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateFlag } from "../evaluator";
import type { SnapshotFlag, SnapshotSegment } from "../types";

const SPEC_DIR = join(
  __dirname,
  "../../../../..",
  "gradual-sdk-spec",
  "testdata"
);
const EVALUATOR_DIR = join(SPEC_DIR, "evaluator");
const HASH_DIR = join(SPEC_DIR, "hash");

// ---------------------------------------------------------------------------
// Hash conformance
// ---------------------------------------------------------------------------

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    // biome-ignore lint/suspicious/noBitwiseOperators: <>
    hash = (hash << 5) - hash + char;
    // biome-ignore lint/suspicious/noBitwiseOperators: <>
    hash |= 0;
  }
  return Math.abs(hash);
}

interface HashVector {
  input: string;
  hash: number;
  bucket: number;
}

describe("hash conformance (spec vectors)", () => {
  const vectors: HashVector[] = JSON.parse(
    readFileSync(join(HASH_DIR, "hash-vectors.json"), "utf-8")
  ).vectors;

  for (const v of vectors) {
    it(`hashString(${JSON.stringify(v.input)}) = ${v.hash}`, () => {
      expect(hashString(v.input)).toBe(v.hash);
    });

    it(`bucket(${JSON.stringify(v.input)}) = ${v.bucket}`, () => {
      expect(hashString(v.input) % 100_000).toBe(v.bucket);
    });
  }
});

// ---------------------------------------------------------------------------
// Evaluator conformance
// ---------------------------------------------------------------------------

interface TestCase {
  name: string;
  flag: SnapshotFlag;
  context: Record<string, Record<string, unknown>>;
  segments: Record<string, SnapshotSegment>;
  options?: { now?: string };
  expected: {
    value?: unknown;
    variationKey?: string | null;
    reasons?: Record<string, unknown>[];
    matchedTargetName?: string | null;
    reasonType?: string;
    stepIndex?: number;
    valueOneOf?: unknown[];
  };
}

interface FixtureFile {
  description: string;
  tests: TestCase[];
}

function reasonMatches(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>
): boolean {
  for (const [key, value] of Object.entries(expected)) {
    if (JSON.stringify(actual[key]) !== JSON.stringify(value)) {
      return false;
    }
  }
  return true;
}

describe("evaluator conformance (spec fixtures)", () => {
  const files = readdirSync(EVALUATOR_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  for (const file of files) {
    const fixture: FixtureFile = JSON.parse(
      readFileSync(join(EVALUATOR_DIR, file), "utf-8")
    );

    describe(file, () => {
      for (const test of fixture.tests) {
        it(test.name, () => {
          const options: { now?: Date } = {};
          if (test.options?.now) {
            options.now = new Date(test.options.now);
          }

          const result = evaluateFlag(
            test.flag,
            test.context ?? {},
            test.segments ?? {},
            options
          );

          const expected = test.expected;

          // Check value (treat null and undefined as equivalent for JSON compat)
          if ("value" in expected) {
            if (expected.value === null) {
              expect(result.value ?? null).toBeNull();
            } else {
              expect(result.value).toEqual(expected.value);
            }
          }

          // Check variationKey
          if ("variationKey" in expected) {
            if (expected.variationKey === null) {
              expect(result.variationKey ?? null).toBeNull();
            } else {
              expect(result.variationKey).toBe(expected.variationKey);
            }
          }

          // Check reasons (subset match)
          if (expected.reasons) {
            for (const expReason of expected.reasons) {
              const found = result.reasons.some((r) => {
                const rObj: Record<string, unknown> = { type: r.type };
                // Copy all enumerable props
                for (const [k, v] of Object.entries(r)) {
                  if (v !== undefined) {
                    rObj[k] = v;
                  }
                }
                return reasonMatches(rObj, expReason);
              });
              expect(found).toBe(true);
            }
          }

          // Check matchedTargetName
          if ("matchedTargetName" in expected) {
            expect(result.matchedTargetName ?? null).toBe(
              expected.matchedTargetName ?? null
            );
          }

          // Check valueOneOf
          if (expected.valueOneOf) {
            expect(expected.valueOneOf).toContainEqual(result.value);
          }
        });
      }
    });
  }
});
