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

export interface SnapshotIndividualEntry {
  contextKind: string;
  attributeKey: string;
  attributeValue: string;
}

export interface SnapshotSegment {
  key: string;
  conditions: SnapshotRuleCondition[];
  included?: SnapshotIndividualEntry[];
  excluded?: SnapshotIndividualEntry[];
}

export interface SnapshotRolloutVariation {
  variationKey: string;
  weight: number; // 0-100000 for 0.001% precision
}

export interface SnapshotScheduleStep {
  durationMinutes: number;
  variations: SnapshotRolloutVariation[];
}

export interface SnapshotRollout {
  variations: SnapshotRolloutVariation[];
  bucketContextKind: string;
  bucketAttributeKey: string;
  seed?: string;
  schedule?: SnapshotScheduleStep[];
  startedAt?: string;
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

export interface RealtimeOptions {
  enabled?: boolean;
}

export interface GradualOptions {
  apiKey: string;
  environment: string;
  baseUrl?: string;
  polling?: PollingOptions;
  realtime?: RealtimeOptions;
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
  | {
      type: "gradual_rollout";
      stepIndex: number;
      percentage: number;
      bucket: number;
    }
  | { type: "default" }
  | { type: "off" }
  | { type: "error"; detail: string; errorCode?: string };

// ---------------------------------------------------------------------------
// EvaluationResult — the canonical evaluation primitive
// ---------------------------------------------------------------------------

export interface EvaluationResult<T = unknown> {
  schemaVersion: 1;
  key: string;
  value: T;
  variationKey?: string;
  reasons: Reason[];
  ruleId?: string;
  flagVersion: number;
  policyVersion?: number;
  evaluatedAt: string;
  evaluationDurationUs?: number;
  inputsUsed?: string[];
  traceId?: string;
}

// ---------------------------------------------------------------------------
// Internal evaluator output (used between evaluator and client)
// ---------------------------------------------------------------------------

export interface EvalOutput {
  value: unknown;
  variationKey: string | undefined;
  reasons: Reason[];
  matchedTargetName?: string;
  errorDetail?: string;
  inputsUsed?: string[];
}

// ---------------------------------------------------------------------------
// Evaluation events (wire format — SDK → Worker → API)
// EvaluationEvent extends EvaluationResult with transport metadata.
// ---------------------------------------------------------------------------

export interface EvaluationEvent<T = unknown> extends EvaluationResult<T> {
  contextKinds: string[];
  contextKeys: Record<string, string[]>;
  contextIdentityHash?: string;
  timestamp: number;
  isAnonymous: boolean;
  matchedTargetName?: string;
  errorDetail?: string;
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
