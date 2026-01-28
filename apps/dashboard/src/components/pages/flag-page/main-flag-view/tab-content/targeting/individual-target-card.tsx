import { Input } from "@gradual/ui/input";
import { Text } from "@gradual/ui/text";
import { useState } from "react";
import { AttributeSelect } from "./attribute-select";
import TargetingCard from "./targeting-card";
import type { Attribute, Variation } from "./types";

interface IndividualTargetCardProps {
  name: string;
  onNameChange: (name: string) => void;
  variations: Variation[];
  attributes: Attribute[];
  selectedVariationId: string;
  initialAttributeKey?: string;
  initialAttributeValue?: string;
  projectSlug: string;
  organizationSlug: string;
  onVariationChange: (variationId: string) => void;
  onIndividualChange: (attributeKey: string, attributeValue: string) => void;
  onDelete: () => void;
}

export function IndividualTargetCard({
  name,
  onNameChange,
  variations,
  attributes,
  selectedVariationId,
  initialAttributeKey,
  initialAttributeValue = "",
  projectSlug,
  organizationSlug,
  onVariationChange,
  onIndividualChange,
  onDelete,
}: IndividualTargetCardProps) {
  const [attributeKey, setAttributeKey] = useState(
    initialAttributeKey ?? attributes[0]?.key ?? ""
  );
  const [attributeValue, setAttributeValue] = useState(initialAttributeValue);

  const handleAttributeKeyChange = (key: string) => {
    setAttributeKey(key);
    onIndividualChange(key, attributeValue);
  };

  const handleAttributeValueChange = (value: string) => {
    setAttributeValue(value);
    onIndividualChange(attributeKey, value);
  };

  return (
    <TargetingCard
      name={name}
      onDelete={onDelete}
      onNameChange={onNameChange}
      onVariationChange={onVariationChange}
      selectedVariationId={selectedVariationId}
      type="individual"
      variations={variations}
    >
      <div className="flex items-center gap-2">
        <Text className="shrink-0 text-ui-fg-muted" size="small">
          Where
        </Text>
        <AttributeSelect
          attributes={attributes}
          onChange={handleAttributeKeyChange}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          value={attributeKey}
        />
        <Text className="shrink-0 text-ui-fg-muted" size="small">
          is
        </Text>
        <Input
          className="h-8 flex-1"
          onChange={(e) => handleAttributeValueChange(e.target.value)}
          placeholder="Enter value"
          value={attributeValue}
        />
      </div>
    </TargetingCard>
  );
}
