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

export interface RuleCondition {
  contextKind?: ContextKind;
  attributeKey: string;
  operator: TargetingOperator;
  value: unknown;
}

export type Variation =
  RouterOutputs["featureFlags"]["getByKey"]["variations"][number];

export type Target =
  RouterOutputs["featureFlags"]["getTargetingRules"]["targets"][number];

export type Attribute = RouterOutputs["attributes"]["list"][number];

export type Context = RouterOutputs["attributes"]["listContexts"][number];

export type ContextKind = "user" | "device" | "organization" | "location";

export type Segment = RouterOutputs["segments"]["list"][number];
