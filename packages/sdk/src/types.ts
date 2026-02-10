export type TargetingOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "in"
  | "not_in"
  | "exists"
  | "not_exists";

export interface SnapshotRuleCondition {
  contextKind: string;
  attributeKey: string;
  operator: TargetingOperator;
  value: unknown;
}

export interface SnapshotSegment {
  key: string;
  conditions: SnapshotRuleCondition[];
}

export interface SnapshotRolloutVariation {
  variationKey: string;
  weight: number; // 0-100000 for 0.001% precision
}

export interface SnapshotRollout {
  variations: SnapshotRolloutVariation[];
  bucketContextKind: string;
  bucketAttributeKey: string;
  seed?: string;
}

export interface SnapshotTarget {
  id?: string;
  type: "rule" | "individual" | "segment";
  sortOrder: number;
  name?: string;
  variationKey?: string;
  rollout?: SnapshotRollout;
  conditions?: SnapshotRuleCondition[];
  contextKind?: string;
  attributeKey?: string;
  attributeValue?: string;
  segmentKey?: string;
}

export interface SnapshotVariation {
  key: string;
  value: unknown;
}

export interface SnapshotFlag {
  key: string;
  type: "boolean" | "string" | "number" | "json";
  enabled: boolean;
  variations: Record<string, SnapshotVariation>;
  offVariationKey: string;
  targets: SnapshotTarget[];
  defaultVariationKey?: string;
  defaultRollout?: SnapshotRollout;
}

export interface EnvironmentSnapshot {
  version: number;
  generatedAt: string;
  meta: {
    projectId: string;
    organizationId: string;
    environmentSlug: string;
    environmentId: string;
  };
  flags: Record<string, SnapshotFlag>;
  segments: Record<string, SnapshotSegment>;
}

export interface EvaluationContext {
  [contextKind: string]: Record<string, unknown>;
}

export interface PollingOptions {
  enabled?: boolean;
  intervalMs?: number;
}

export interface GradualOptions {
  apiKey: string;
  environment: string;
  baseUrl?: string;
  polling?: PollingOptions;
  events?: EventsOptions;
}

export interface FlagOptions<T> {
  fallback: T;
  context?: EvaluationContext;
}

export interface IsEnabledOptions {
  context?: EvaluationContext;
}

// ---------------------------------------------------------------------------
// Structured Reason (v1)
// ---------------------------------------------------------------------------

export type Reason =
  | { type: "rule_match"; ruleId: string; ruleName?: string }
  | { type: "percentage_rollout"; percentage: number; bucket: number }
  | { type: "default" }
  | { type: "off" }
  | { type: "error"; detail: string };

// ---------------------------------------------------------------------------
// EvaluationResult — the core primitive
// ---------------------------------------------------------------------------

export interface EvaluationResult<T = unknown> {
  key: string;
  value: T;
  variationKey?: string;
  reasons: Reason[];
  ruleId?: string;
  version: number;
  evaluatedAt: string;
}

// ---------------------------------------------------------------------------
// Legacy types (kept for wire format backwards compat)
// ---------------------------------------------------------------------------

export type LegacyEvaluationReason =
  | "FLAG_DISABLED"
  | "TARGET_MATCH"
  | "DEFAULT_ROLLOUT"
  | "DEFAULT_VARIATION"
  | "FLAG_NOT_FOUND"
  | "ERROR";

/** @deprecated Use LegacyEvaluationReason */
export type EvaluationReason = LegacyEvaluationReason;

// ---------------------------------------------------------------------------
// Internal evaluator output (used between evaluator and client)
// ---------------------------------------------------------------------------

export interface EvalOutput {
  value: unknown;
  variationKey: string | undefined;
  legacyReason: LegacyEvaluationReason;
  reasons: Reason[];
  matchedTargetName?: string;
  errorDetail?: string;
}

// ---------------------------------------------------------------------------
// Evaluation events (wire format — SDK → Worker → API)
// ---------------------------------------------------------------------------

export interface EvaluationEvent {
  flagKey: string;
  variationKey: string | undefined;
  value: unknown;
  reason: LegacyEvaluationReason;
  reasons?: Reason[];
  contextKinds: string[];
  contextKeys: Record<string, string[]>;
  timestamp: number;
  evaluatedAt?: string;
  matchedTargetName?: string;
  ruleId?: string;
  flagConfigVersion?: number;
  errorDetail?: string;
  evaluationDurationUs?: number;
  isAnonymous: boolean;
}

export interface EvaluationBatchPayload {
  meta: {
    projectId: string;
    organizationId: string;
    environmentId: string;
    sdkVersion: string;
    sdkPlatform?: string;
  };
  events: EvaluationEvent[];
}

export interface EventsOptions {
  enabled?: boolean;
  flushIntervalMs?: number;
  maxBatchSize?: number;
}
