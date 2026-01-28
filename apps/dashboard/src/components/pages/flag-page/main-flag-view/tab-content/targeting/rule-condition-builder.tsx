import { Button } from "@gradual/ui/button";
import { Input } from "@gradual/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gradual/ui/select";
import { Text } from "@gradual/ui/text";
import { RiAddLine, RiSubtractFill } from "@remixicon/react";
import { useCallback } from "react";
import { AttributeSelect } from "./attribute-select";
import { useTargetingStore } from "./targeting-store";
import type { RuleCondition, TargetingOperator } from "./types";

// Hoisted static array (rendering-hoist-jsx)
const OPERATORS: { label: string; value: TargetingOperator }[] = [
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
];

interface RuleConditionBuilderProps {
  conditions: RuleCondition[];
  projectSlug: string;
  organizationSlug: string;
  onChange: (conditions: RuleCondition[]) => void;
}

export function RuleConditionBuilder({
  conditions,
  projectSlug,
  organizationSlug,
  onChange,
}: RuleConditionBuilderProps) {
  // Get attributes from store (eliminates prop drilling)
  const attributes = useTargetingStore((s) => s.attributes);

  const handleAddCondition = useCallback(() => {
    const newCondition: RuleCondition = {
      attributeKey: attributes[0]?.key ?? "",
      operator: "equals",
      value: "",
    };
    onChange([...conditions, newCondition]);
  }, [attributes, conditions, onChange]);

  const handleRemoveCondition = useCallback(
    (index: number) => {
      onChange(conditions.filter((_, i) => i !== index));
    },
    [conditions, onChange]
  );

  const handleConditionChange = useCallback(
    (index: number, updates: Partial<RuleCondition>) => {
      onChange(
        conditions.map((c, i) => (i === index ? { ...c, ...updates } : c))
      );
    },
    [conditions, onChange]
  );

  return (
    <div>
      <div className="flex flex-col gap-2">
        {conditions.map((condition, index) => (
          <ConditionRow
            condition={condition}
            index={index}
            key={index}
            onChange={(updates) => handleConditionChange(index, updates)}
            onRemove={() => handleRemoveCondition(index)}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
          />
        ))}
      </div>
      <Button
        className="mt-3 ml-6 w-fit gap-x-0.5"
        onClick={handleAddCondition}
        size="small"
        variant="outline"
      >
        <RiAddLine className="mr-1 size-4" />
        Add condition
      </Button>
    </div>
  );
}

interface ConditionRowProps {
  condition: RuleCondition;
  index: number;
  projectSlug: string;
  organizationSlug: string;
  onChange: (updates: Partial<RuleCondition>) => void;
  onRemove: () => void;
}

function ConditionRow({
  condition,
  index,
  projectSlug,
  organizationSlug,
  onChange,
  onRemove,
}: ConditionRowProps) {
  return (
    <div className="ml-8 flex items-center gap-2">
      <Text className="w-10 shrink-0 text-ui-fg-muted" size="small">
        {index === 0 ? "IF" : "AND"}
      </Text>

      <AttributeSelect
        onChange={(key) => onChange({ attributeKey: key })}
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        value={condition.attributeKey}
      />

      <Select
        items={OPERATORS}
        onValueChange={(value) => {
          if (value) {
            onChange({ operator: value as TargetingOperator });
          }
        }}
        value={condition.operator}
      >
        <SelectTrigger className="h-8 w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} className="pb-2">
          {OPERATORS.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        className="h-8 flex-1"
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder="Value"
        value={String(condition.value ?? "")}
      />

      <Button
        className="size-6"
        onClick={onRemove}
        size="small"
        variant="destructive"
      >
        <RiSubtractFill className="size-4 shrink-0" />
      </Button>
    </div>
  );
}
