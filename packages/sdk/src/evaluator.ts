import type {
  EvaluationContext,
  SnapshotFlag,
  SnapshotRollout,
  SnapshotRuleCondition,
  SnapshotSegment,
  SnapshotTarget,
  SnapshotVariation,
} from "./types";

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    // biome-ignore lint/suspicious/noBitwiseOperators: intentional hash algorithm using bitwise shift
    hash = (hash << 5) - hash + char;
    // biome-ignore lint/suspicious/noBitwiseOperators: converting to 32-bit integer
    hash |= 0;
  }
  return Math.abs(hash);
}

function getBucketValue(
  flagKey: string,
  context: EvaluationContext,
  rollout: SnapshotRollout
): number {
  const bucketKey =
    context[rollout.bucketContextKind]?.[rollout.bucketAttributeKey];
  const seed = rollout.seed ?? "";
  const hashInput = `${flagKey}:${seed}:${String(bucketKey ?? "anonymous")}`;
  return hashString(hashInput) % 100_000;
}

function selectVariationFromRollout(
  rollout: SnapshotRollout,
  bucketValue: number,
  variations: Record<string, SnapshotVariation>
): SnapshotVariation | undefined {
  let cumulative = 0;

  for (const rv of rollout.variations) {
    cumulative += rv.weight;
    if (bucketValue < cumulative) {
      return variations[rv.variationKey];
    }
  }

  const lastVariation = rollout.variations.at(-1);
  return lastVariation ? variations[lastVariation.variationKey] : undefined;
}

function evaluateCondition(
  condition: SnapshotRuleCondition,
  context: EvaluationContext
): boolean {
  const { contextKind, attributeKey, operator, value } = condition;
  const contextValue = context[contextKind]?.[attributeKey];

  switch (operator) {
    case "equals":
      return contextValue === value;

    case "not_equals":
      return contextValue !== value;

    case "contains":
      if (typeof contextValue === "string" && typeof value === "string") {
        return contextValue.includes(value);
      }
      if (Array.isArray(contextValue)) {
        return contextValue.includes(value);
      }
      return false;

    case "not_contains":
      if (typeof contextValue === "string" && typeof value === "string") {
        return !contextValue.includes(value);
      }
      if (Array.isArray(contextValue)) {
        return !contextValue.includes(value);
      }
      return true;

    case "starts_with":
      if (typeof contextValue === "string" && typeof value === "string") {
        return contextValue.startsWith(value);
      }
      return false;

    case "ends_with":
      if (typeof contextValue === "string" && typeof value === "string") {
        return contextValue.endsWith(value);
      }
      return false;

    case "greater_than":
      if (typeof contextValue === "number" && typeof value === "number") {
        return contextValue > value;
      }
      return false;

    case "less_than":
      if (typeof contextValue === "number" && typeof value === "number") {
        return contextValue < value;
      }
      return false;

    case "greater_than_or_equal":
      if (typeof contextValue === "number" && typeof value === "number") {
        return contextValue >= value;
      }
      return false;

    case "less_than_or_equal":
      if (typeof contextValue === "number" && typeof value === "number") {
        return contextValue <= value;
      }
      return false;

    case "in":
      if (Array.isArray(value)) {
        return value.includes(contextValue);
      }
      return false;

    case "not_in":
      if (Array.isArray(value)) {
        return !value.includes(contextValue);
      }
      return true;

    case "exists":
      return contextValue !== undefined && contextValue !== null;

    case "not_exists":
      return contextValue === undefined || contextValue === null;

    default:
      return false;
  }
}

function evaluateConditions(
  conditions: SnapshotRuleCondition[],
  context: EvaluationContext
): boolean {
  return conditions.every((condition) => evaluateCondition(condition, context));
}

function evaluateSegment(
  segment: SnapshotSegment,
  context: EvaluationContext
): boolean {
  return evaluateConditions(segment.conditions, context);
}

function evaluateTarget(
  target: SnapshotTarget,
  context: EvaluationContext,
  segments: Record<string, SnapshotSegment>
): boolean {
  switch (target.type) {
    case "individual":
      if (
        target.contextKind &&
        target.attributeKey &&
        target.attributeValue !== undefined
      ) {
        return (
          context[target.contextKind]?.[target.attributeKey] ===
          target.attributeValue
        );
      }
      return false;

    case "rule":
      if (target.conditions) {
        return evaluateConditions(target.conditions, context);
      }
      return false;

    case "segment":
      if (target.segmentKey) {
        const segment = segments[target.segmentKey];
        if (segment) {
          return evaluateSegment(segment, context);
        }
      }
      return false;

    default:
      return false;
  }
}

function resolveTargetVariation(
  target: SnapshotTarget,
  flagKey: string,
  context: EvaluationContext,
  variations: Record<string, SnapshotVariation>
): SnapshotVariation | undefined {
  if (target.rollout) {
    const bucketValue = getBucketValue(flagKey, context, target.rollout);
    return selectVariationFromRollout(target.rollout, bucketValue, variations);
  }

  if (target.variationKey) {
    return variations[target.variationKey];
  }

  return undefined;
}

function resolveDefaultVariation(
  flag: SnapshotFlag,
  context: EvaluationContext
): SnapshotVariation | undefined {
  if (flag.defaultRollout) {
    const bucketValue = getBucketValue(flag.key, context, flag.defaultRollout);
    return selectVariationFromRollout(
      flag.defaultRollout,
      bucketValue,
      flag.variations
    );
  }

  if (flag.defaultVariationKey) {
    return flag.variations[flag.defaultVariationKey];
  }

  return undefined;
}

export function evaluateFlag(
  flag: SnapshotFlag,
  context: EvaluationContext,
  segments: Record<string, SnapshotSegment>
): unknown {
  if (!flag.enabled) {
    const offVariation = flag.variations[flag.offVariationKey];
    return offVariation?.value;
  }

  const sortedTargets = [...flag.targets].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  for (const target of sortedTargets) {
    if (evaluateTarget(target, context, segments)) {
      const variation = resolveTargetVariation(
        target,
        flag.key,
        context,
        flag.variations
      );
      if (variation) {
        return variation.value;
      }
    }
  }

  const defaultVariation = resolveDefaultVariation(flag, context);
  return defaultVariation?.value;
}
