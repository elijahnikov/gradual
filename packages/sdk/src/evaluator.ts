import type {
  EvalOutput,
  EvaluationContext,
  Reason,
  SnapshotFlag,
  SnapshotIndividualEntry,
  SnapshotRollout,
  SnapshotRolloutVariation,
  SnapshotRuleCondition,
  SnapshotScheduleStep,
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
  rollout: SnapshotRollout,
  inputsUsed: Set<string>
): number {
  inputsUsed.add(`${rollout.bucketContextKind}.${rollout.bucketAttributeKey}`);
  const bucketKey =
    context[rollout.bucketContextKind]?.[rollout.bucketAttributeKey];
  const seed = rollout.seed ?? "";
  const hashInput = `${flagKey}:${seed}:${String(bucketKey ?? "anonymous")}`;
  return hashString(hashInput) % 100_000;
}

interface ActiveRollout {
  variations: SnapshotRolloutVariation[];
  stepIndex: number;
}

function resolveActiveRollout(
  rollout: SnapshotRollout,
  now: Date
): ActiveRollout {
  if (!(rollout.schedule && rollout.startedAt)) {
    return { variations: rollout.variations, stepIndex: -1 };
  }

  const startedAt = new Date(rollout.startedAt).getTime();
  const elapsedMs = now.getTime() - startedAt;
  const elapsedMinutes = elapsedMs / 60_000;

  if (elapsedMinutes < 0) {
    return {
      variations: rollout.schedule[0]?.variations ?? rollout.variations,
      stepIndex: 0,
    };
  }

  let cumulativeMinutes = 0;
  for (let i = 0; i < rollout.schedule.length; i++) {
    const step = rollout.schedule[i] as SnapshotScheduleStep;
    if (step.durationMinutes === 0) {
      return { variations: step.variations, stepIndex: i };
    }
    cumulativeMinutes += step.durationMinutes;
    if (elapsedMinutes < cumulativeMinutes) {
      return { variations: step.variations, stepIndex: i };
    }
  }

  const lastStep = rollout.schedule.at(-1);
  return {
    variations: lastStep?.variations ?? rollout.variations,
    stepIndex: rollout.schedule.length - 1,
  };
}

interface RolloutResult {
  variation: SnapshotVariation;
  variationKey: string;
  matchedWeight: number;
  bucketValue: number;
  scheduleStepIndex: number;
}

function selectVariationFromRollout(
  activeVariations: SnapshotRolloutVariation[],
  bucketValue: number,
  variations: Record<string, SnapshotVariation>,
  scheduleStepIndex: number
): RolloutResult | undefined {
  let cumulative = 0;
  let matchedRv: SnapshotRolloutVariation | undefined;

  for (const rv of activeVariations) {
    cumulative += rv.weight;
    if (bucketValue < cumulative) {
      matchedRv = rv;
      break;
    }
  }

  if (!matchedRv) {
    matchedRv = activeVariations.at(-1);
  }

  if (!matchedRv) {
    return undefined;
  }

  const variation = variations[matchedRv.variationKey];
  if (!variation) {
    return undefined;
  }

  return {
    variation,
    variationKey: matchedRv.variationKey,
    matchedWeight: matchedRv.weight,
    bucketValue,
    scheduleStepIndex,
  };
}

function evaluateCondition(
  condition: SnapshotRuleCondition,
  context: EvaluationContext,
  inputsUsed: Set<string>
): boolean {
  const { contextKind, attributeKey, operator, value } = condition;
  inputsUsed.add(`${contextKind}.${attributeKey}`);
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
  context: EvaluationContext,
  inputsUsed: Set<string>
): boolean {
  return conditions.every((condition) =>
    evaluateCondition(condition, context, inputsUsed)
  );
}

function matchesIndividual(
  entries: SnapshotIndividualEntry[],
  context: EvaluationContext,
  inputsUsed: Set<string>
): boolean {
  for (const entry of entries) {
    inputsUsed.add(`${entry.contextKind}.${entry.attributeKey}`);
    if (
      context[entry.contextKind]?.[entry.attributeKey] === entry.attributeValue
    ) {
      return true;
    }
  }
  return false;
}

function evaluateSegment(
  segment: SnapshotSegment,
  context: EvaluationContext,
  inputsUsed: Set<string>
): boolean {
  // Priority 1: Excluded individuals never match
  if (
    segment.excluded?.length &&
    matchesIndividual(segment.excluded, context, inputsUsed)
  ) {
    return false;
  }

  // Priority 2: Included individuals always match
  if (
    segment.included?.length &&
    matchesIndividual(segment.included, context, inputsUsed)
  ) {
    return true;
  }

  // Priority 3: Evaluate conditions
  return evaluateConditions(segment.conditions, context, inputsUsed);
}

function evaluateTarget(
  target: SnapshotTarget,
  context: EvaluationContext,
  segments: Record<string, SnapshotSegment>,
  inputsUsed: Set<string>
): boolean {
  switch (target.type) {
    case "individual":
      if (
        target.contextKind &&
        target.attributeKey &&
        target.attributeValue !== undefined
      ) {
        inputsUsed.add(`${target.contextKind}.${target.attributeKey}`);
        return (
          context[target.contextKind]?.[target.attributeKey] ===
          target.attributeValue
        );
      }
      return false;

    case "rule":
      if (target.conditions) {
        return evaluateConditions(target.conditions, context, inputsUsed);
      }
      return false;

    case "segment":
      if (target.segmentKey) {
        const segment = segments[target.segmentKey];
        if (segment) {
          return evaluateSegment(segment, context, inputsUsed);
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
  variations: Record<string, SnapshotVariation>,
  inputsUsed: Set<string>,
  now: Date
): RolloutResult | undefined {
  if (target.rollout) {
    const active = resolveActiveRollout(target.rollout, now);
    const bucketValue = getBucketValue(
      flagKey,
      context,
      target.rollout,
      inputsUsed
    );
    return selectVariationFromRollout(
      active.variations,
      bucketValue,
      variations,
      active.stepIndex
    );
  }

  if (target.variationKey) {
    const variation = variations[target.variationKey];
    if (variation) {
      return {
        variation,
        variationKey: target.variationKey,
        matchedWeight: 100_000,
        bucketValue: 0,
        scheduleStepIndex: -1,
      };
    }
  }

  return undefined;
}

function resolveDefaultVariation(
  flag: SnapshotFlag,
  context: EvaluationContext,
  inputsUsed: Set<string>,
  now: Date
): RolloutResult | undefined {
  if (flag.defaultRollout) {
    const active = resolveActiveRollout(flag.defaultRollout, now);
    const bucketValue = getBucketValue(
      flag.key,
      context,
      flag.defaultRollout,
      inputsUsed
    );
    return selectVariationFromRollout(
      active.variations,
      bucketValue,
      flag.variations,
      active.stepIndex
    );
  }

  if (flag.defaultVariationKey) {
    const variation = flag.variations[flag.defaultVariationKey];
    if (variation) {
      return {
        variation,
        variationKey: flag.defaultVariationKey,
        matchedWeight: 100_000,
        bucketValue: 0,
        scheduleStepIndex: -1,
      };
    }
  }

  return undefined;
}

function buildRuleMatchReason(target: SnapshotTarget): Reason {
  return {
    type: "rule_match",
    ruleId: target.id ?? "",
    ruleName: target.name,
  };
}

function buildRolloutReason(rolloutResult: RolloutResult): Reason {
  if (rolloutResult.scheduleStepIndex >= 0) {
    return {
      type: "gradual_rollout",
      stepIndex: rolloutResult.scheduleStepIndex,
      percentage: rolloutResult.matchedWeight / 1000,
      bucket: rolloutResult.bucketValue,
    };
  }
  return {
    type: "percentage_rollout",
    percentage: rolloutResult.matchedWeight / 1000,
    bucket: rolloutResult.bucketValue,
  };
}

export function evaluateFlag(
  flag: SnapshotFlag,
  context: EvaluationContext,
  segments: Record<string, SnapshotSegment>,
  options?: { now?: Date }
): EvalOutput {
  if (!flag.enabled) {
    const offVariation = flag.variations[flag.offVariationKey];
    return {
      value: offVariation?.value,
      variationKey: flag.offVariationKey,
      reasons: [{ type: "off" }],
      inputsUsed: [],
    };
  }

  const now = options?.now ?? new Date();
  const inputsUsed = new Set<string>();

  const sortedTargets = [...flag.targets].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  for (const target of sortedTargets) {
    if (evaluateTarget(target, context, segments, inputsUsed)) {
      const resolved = resolveTargetVariation(
        target,
        flag.key,
        context,
        flag.variations,
        inputsUsed,
        now
      );
      if (resolved) {
        const reasons: Reason[] = [buildRuleMatchReason(target)];
        if (target.rollout) {
          reasons.push(buildRolloutReason(resolved));
        }

        return {
          value: resolved.variation.value,
          variationKey: resolved.variationKey,
          reasons,
          matchedTargetName: target.name,
          inputsUsed: [...inputsUsed],
        };
      }
    }
  }

  const resolved = resolveDefaultVariation(flag, context, inputsUsed, now);
  if (resolved) {
    const reasons: Reason[] = [];
    if (flag.defaultRollout) {
      reasons.push(buildRolloutReason(resolved));
    }
    reasons.push({ type: "default" });

    return {
      value: resolved.variation.value,
      variationKey: resolved.variationKey,
      reasons,
      inputsUsed: [...inputsUsed],
    };
  }

  return {
    value: undefined,
    variationKey: undefined,
    reasons: [{ type: "default" }],
    inputsUsed: [...inputsUsed],
  };
}
