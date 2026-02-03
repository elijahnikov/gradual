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
  attributeKey: string;
  operator: TargetingOperator;
  value: unknown;
}

export interface SnapshotSegment {
  key: string;
  conditions: SnapshotRuleCondition[];
}

export interface SnapshotTarget {
  type: "rule" | "individual" | "segment";
  variationKey: string;
  sortOrder: number;

  conditions?: SnapshotRuleCondition[];
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
  defaultVariationKey: string;
  offVariationKey: string;
  targets: SnapshotTarget[];
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

export interface SnapshotJobMessage {
  orgId: string;
  projectId: string;
  environmentSlug: string;
}
