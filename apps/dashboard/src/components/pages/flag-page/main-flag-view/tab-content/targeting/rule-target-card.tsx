import { useState } from "react";
import { RuleConditionBuilder } from "./rule-condition-builder";
import TargetingCard from "./targeting-card";
import type { Attribute, RuleCondition, Variation } from "./types";

interface RuleTargetCardProps {
  name: string;
  onNameChange: (name: string) => void;
  variations: Variation[];
  attributes: Attribute[];
  selectedVariationId: string;
  initialConditions?: RuleCondition[];
  projectSlug: string;
  organizationSlug: string;
  onVariationChange: (variationId: string) => void;
  onConditionsChange: (conditions: RuleCondition[]) => void;
  onDelete: () => void;
}

export function RuleTargetCard({
  name,
  onNameChange,
  variations,
  attributes,
  selectedVariationId,
  initialConditions = [],
  projectSlug,
  organizationSlug,
  onVariationChange,
  onConditionsChange,
  onDelete,
}: RuleTargetCardProps) {
  const [conditions, setConditions] = useState<RuleCondition[]>(
    initialConditions.length > 0
      ? initialConditions
      : [
          {
            attributeKey: attributes[0]?.key ?? "",
            operator: "equals",
            value: "",
          },
        ]
  );

  const handleConditionsChange = (newConditions: RuleCondition[]) => {
    setConditions(newConditions);
    onConditionsChange(newConditions);
  };

  return (
    <TargetingCard
      name={name}
      onDelete={onDelete}
      onNameChange={onNameChange}
      onVariationChange={onVariationChange}
      selectedVariationId={selectedVariationId}
      type="rule"
      variations={variations}
    >
      <RuleConditionBuilder
        attributes={attributes}
        conditions={conditions}
        onChange={handleConditionsChange}
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
      />
    </TargetingCard>
  );
}
