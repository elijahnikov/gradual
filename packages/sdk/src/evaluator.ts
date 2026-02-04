import type {
  EvaluationContext,
  SnapshotFlag,
  SnapshotRuleCondition,
  SnapshotSegment,
  SnapshotTarget,
} from "./types";

function evaluateCondition(
  condition: SnapshotRuleCondition,
  context: EvaluationContext
): boolean {
  const { attributeKey, operator, value } = condition;
  const contextValue = context[attributeKey];

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
      if (target.attributeKey && target.attributeValue !== undefined) {
        return context[target.attributeKey] === target.attributeValue;
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
      const variation = flag.variations[target.variationKey];
      if (variation) {
        return variation.value;
      }
    }
  }

  const defaultVariation = flag.variations[flag.defaultVariationKey];
  return defaultVariation?.value;
}
