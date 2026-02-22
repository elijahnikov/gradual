import type { RouterOutputs } from "@gradual/api";

export type TargetType = "rule" | "individual" | "segment";

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

export const OPERATOR_OPTIONS: { label: string; value: TargetingOperator }[] = [
  { label: "equals", value: "equals" },
  { label: "does not equal", value: "not_equals" },
  { label: "contains", value: "contains" },
  { label: "does not contain", value: "not_contains" },
  { label: "starts with", value: "starts_with" },
  { label: "ends with", value: "ends_with" },
  { label: "is in list", value: "in" },
  { label: "is not in list", value: "not_in" },
  { label: "greater than", value: "greater_than" },
  { label: "less than", value: "less_than" },
  { label: "greater than or equal to", value: "greater_than_or_equal" },
  { label: "less than or equal to", value: "less_than_or_equal" },
  { label: "exists", value: "exists" },
  { label: "does not exist", value: "not_exists" },
];

export const OPERATOR_LABELS: Record<TargetingOperator, string> =
  Object.fromEntries(
    OPERATOR_OPTIONS.map((op) => [op.value, op.label])
  ) as Record<TargetingOperator, string>;

export interface RuleCondition {
  contextKind: string;
  attributeKey: string;
  operator: TargetingOperator;
  value: unknown;
}

export type Variation =
  RouterOutputs["featureFlags"]["getByKey"]["variations"][number];

export type Attribute = RouterOutputs["attributes"]["list"][number];

export type Context = RouterOutputs["attributes"]["listContexts"][number];

export type ContextKind = string;

export type Segment = RouterOutputs["segments"]["list"]["items"][number];
