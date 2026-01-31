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
      <div className="flex flex-col gap-3 sm:gap-2">
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
        className="mt-3 w-fit gap-x-0.5 sm:ml-6"
        onClick={handleAddCondition}
        size="small"
        variant="outline"
      >
        <RiAddLine className="size-4" />
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
    <div className="flex flex-col gap-2 rounded-md border border-ui-border-base bg-ui-bg-subtle p-2 sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0 sm:pl-8">
      <div className="flex items-center justify-between sm:contents">
        <Text className="w-10 shrink-0 text-ui-fg-muted" size="small">
          {index === 0 ? "IF" : "AND"}
        </Text>
        <Button
          className="size-6 sm:order-last"
          onClick={onRemove}
          size="small"
          variant="destructive"
        >
          <RiSubtractFill className="size-4 shrink-0" />
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center">
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
          <SelectTrigger className="h-8 w-full sm:w-40">
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
          className="h-8 w-full sm:flex-1"
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="Value"
          value={String(condition.value ?? "")}
        />
      </div>
    </div>
  );
}
