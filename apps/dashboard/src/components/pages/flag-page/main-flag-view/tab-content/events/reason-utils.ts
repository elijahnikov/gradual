export interface StructuredReason {
  type: string;
  ruleId?: string;
  ruleName?: string;
  percentage?: number;
  bucket?: number;
  detail?: string;
  errorCode?: string;
}

export function isStructuredReason(v: unknown): v is StructuredReason {
  return typeof v === "object" && v !== null && "type" in v;
}

export const structuredReasonVariants: Record<
  string,
  "secondary" | "success" | "warning" | "error" | "info" | "outline"
> = {
  rule_match: "success",
  percentage_rollout: "info",
  default: "outline",
  off: "secondary",
  error: "error",
};

export function formatStructuredReason(reason: StructuredReason): string {
  switch (reason.type) {
    case "rule_match":
      return reason.ruleName
        ? `Matched rule "${reason.ruleName}"`
        : "Matched a targeting rule";
    case "percentage_rollout":
      return reason.percentage != null
        ? `Rolled out at ${(reason.percentage / 100).toFixed(1)}%`
        : "Included in percentage rollout";
    case "default":
      return "Served default variation";
    case "off":
      return "Flag is disabled";
    case "error":
      if (reason.errorCode && reason.detail) {
        return `Evaluation error [${reason.errorCode}]: ${reason.detail}`;
      }
      return reason.detail
        ? `Evaluation error: ${reason.detail}`
        : "Evaluation error";
    default:
      return reason.type;
  }
}

/** Concise label for table display — collapses multiple reasons into one descriptive string */
export function summarizeReasons(reasons: StructuredReason[]): {
  label: string;
  variant: "secondary" | "success" | "warning" | "error" | "info" | "outline";
} {
  if (reasons.length === 0) {
    return { label: "No reason recorded", variant: "outline" };
  }

  const primary = reasons[0];
  if (!primary) {
    return { label: "No reason recorded", variant: "outline" };
  }
  const variant = structuredReasonVariants[primary.type] ?? "outline";

  if (primary.type === "off") {
    return { label: "Flag is disabled", variant };
  }

  if (primary.type === "error") {
    return { label: "Evaluation error", variant };
  }

  if (primary.type === "default") {
    const rollout = reasons.find((r) => r.type === "percentage_rollout") as
      | StructuredReason
      | undefined;
    if (rollout?.percentage != null) {
      return {
        label: `Rolled out at ${(rollout.percentage / 100).toFixed(1)}%`,
        variant: "info",
      };
    }
    return { label: "Served default variation", variant };
  }

  if (primary.type === "rule_match") {
    const rollout = reasons.find((r) => r.type === "percentage_rollout") as
      | StructuredReason
      | undefined;
    const name = primary.ruleName
      ? `Matched rule "${primary.ruleName}"`
      : "Matched targeting rule";
    if (rollout?.percentage != null) {
      return {
        label: `${name} (${(rollout.percentage / 100).toFixed(1)}%)`,
        variant,
      };
    }
    return { label: name, variant };
  }

  if (primary.type === "percentage_rollout") {
    const hasDefault = reasons.some((r) => r.type === "default");
    const pct =
      primary.percentage != null
        ? `${(primary.percentage / 100).toFixed(1)}%`
        : "";
    if (hasDefault) {
      return {
        label: pct ? `Rolled out at ${pct}` : "Included in default rollout",
        variant,
      };
    }
    return {
      label: pct ? `Rolled out at ${pct}` : "Included in percentage rollout",
      variant,
    };
  }

  return { label: formatStructuredReason(primary), variant };
}
