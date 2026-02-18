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
import { ContextSelect } from "./context-select";
import {
  type ContextKind,
  OPERATOR_OPTIONS,
  type RuleCondition,
  type TargetingOperator,
} from "./types";

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
  const handleAddCondition = useCallback(() => {
    const newCondition: RuleCondition = {
      contextKind: "user",
      attributeKey: "",
      operator: "equals",
      value: "",
    };
    onChange([...conditions, newCondition]);
  }, [conditions, onChange]);

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
        className="mt-2.5 w-fit gap-x-0.5 sm:ml-6"
        onClick={handleAddCondition}
        size="xsmall"
        variant="outline"
      >
        <RiAddLine className="size-3" />
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
  const handleContextChange = (kind: ContextKind) => {
    onChange({ contextKind: kind, attributeKey: "" });
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-ui-border-base bg-ui-bg-subtle p-2 sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0 sm:pl-6">
      <div className="flex items-center justify-between sm:contents">
        <Text
          className="w-10 shrink-0 font-mono text-sm text-ui-fg-muted"
          size="small"
        >
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
        <ContextSelect
          onChange={handleContextChange}
          value={condition.contextKind}
        />

        <AttributeSelect
          contextKind={condition.contextKind}
          onChange={(key) => onChange({ attributeKey: key })}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          value={condition.attributeKey}
        />

        <Select
          items={OPERATOR_OPTIONS}
          onValueChange={(value) => {
            if (value) {
              onChange({ operator: value as TargetingOperator });
            }
          }}
          value={condition.operator}
        >
          <SelectTrigger className="min-h-7! w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="pb-2">
            {OPERATOR_OPTIONS.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          className="h-7 w-full sm:flex-1"
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="Value"
          value={String(condition.value ?? "")}
        />
      </div>
    </div>
  );
}
