import { Input } from "@gradual/ui/input";
import { Text } from "@gradual/ui/text";
import { useCallback } from "react";
import { AttributeSelect } from "./attribute-select";
import TargetingCard from "./targeting-card";
import { useTargetingStore } from "./targeting-store";

interface IndividualTargetCardProps {
  targetId: string;
}

export function IndividualTargetCard({ targetId }: IndividualTargetCardProps) {
  // Get target data from store
  const target = useTargetingStore((s) =>
    s.targets.find((t) => t.id === targetId)
  );

  // Get stable action references from store (rerender-functional-setstate)
  const updateTargetName = useTargetingStore((s) => s.updateTargetName);
  const updateTargetVariation = useTargetingStore(
    (s) => s.updateTargetVariation
  );
  const updateTargetIndividual = useTargetingStore(
    (s) => s.updateTargetIndividual
  );
  const deleteTarget = useTargetingStore((s) => s.deleteTarget);

  // Get shared data from store
  const attributes = useTargetingStore((s) => s.attributes);
  const organizationSlug = useTargetingStore((s) => s.organizationSlug);
  const projectSlug = useTargetingStore((s) => s.projectSlug);

  // Stable callbacks using store actions
  const handleNameChange = useCallback(
    (name: string) => updateTargetName(targetId, name),
    [updateTargetName, targetId]
  );

  const handleVariationChange = useCallback(
    (variationId: string) => updateTargetVariation(targetId, variationId),
    [updateTargetVariation, targetId]
  );

  const handleDelete = useCallback(
    () => deleteTarget(targetId),
    [deleteTarget, targetId]
  );

  if (!target) {
    return null;
  }

  // Get current values with defaults (rerender-lazy-state-init)
  const attributeKey = target.attributeKey ?? attributes[0]?.key ?? "";
  const attributeValue = target.attributeValue ?? "";

  const handleAttributeKeyChange = (key: string) => {
    updateTargetIndividual(targetId, key, attributeValue);
  };

  const handleAttributeValueChange = (value: string) => {
    updateTargetIndividual(targetId, attributeKey, value);
  };

  return (
    <TargetingCard
      name={target.name}
      onDelete={handleDelete}
      onNameChange={handleNameChange}
      onVariationChange={handleVariationChange}
      selectedVariationId={target.variationId}
      targetId={targetId}
    >
      <div className="flex items-center gap-2">
        <Text className="shrink-0 text-ui-fg-muted" size="small">
          Where
        </Text>
        <AttributeSelect
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
