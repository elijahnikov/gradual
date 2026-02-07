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
  type: "rule" | "individual" | "segment";
  sortOrder: number;
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

export type EvaluationReason =
  | "FLAG_DISABLED"
  | "TARGET_MATCH"
  | "DEFAULT_ROLLOUT"
  | "DEFAULT_VARIATION"
  | "FLAG_NOT_FOUND"
  | "ERROR";

export interface EvaluationResult {
  value: unknown;
  variationKey: string | undefined;
  reason: EvaluationReason;
}

export interface EvaluationEvent {
  flagKey: string;
  variationKey: string | undefined;
  value: unknown;
  reason: EvaluationReason;
  contextKinds: string[];
  contextKeys: Record<string, string[]>;
  timestamp: number;
}

export interface EvaluationBatchPayload {
  meta: {
    projectId: string;
    organizationId: string;
    environmentId: string;
    sdkVersion: string;
  };
  events: EvaluationEvent[];
}

export interface EventsOptions {
  enabled?: boolean;
  flushIntervalMs?: number;
  maxBatchSize?: number;
}
