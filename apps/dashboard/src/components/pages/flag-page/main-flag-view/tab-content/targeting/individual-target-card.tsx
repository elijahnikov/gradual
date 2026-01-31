import { Input } from "@gradual/ui/input";
import { Text } from "@gradual/ui/text";
import { useCallback } from "react";
import { AttributeSelect } from "./attribute-select";
import { ContextSelect } from "./context-select";
import TargetingCard from "./targeting-card";
import { useTargetingStore } from "./targeting-store";
import type { ContextKind } from "./types";

interface IndividualTargetCardProps {
  targetId: string;
}

export function IndividualTargetCard({ targetId }: IndividualTargetCardProps) {
  // Get target data from store
  const target = useTargetingStore((s) =>
    s.targets.find((t) => t.id === targetId)
  );

  // Get target position info for move actions
  const targetIndex = useTargetingStore((s) =>
    s.targets.findIndex((t) => t.id === targetId)
  );
  const targetsCount = useTargetingStore((s) => s.targets.length);

  // Get stable action references from store (rerender-functional-setstate)
  const updateTargetName = useTargetingStore((s) => s.updateTargetName);
  const updateTargetVariation = useTargetingStore(
    (s) => s.updateTargetVariation
  );
  const updateTargetIndividual = useTargetingStore(
    (s) => s.updateTargetIndividual
  );
  const deleteTarget = useTargetingStore((s) => s.deleteTarget);
  const moveTarget = useTargetingStore((s) => s.moveTarget);

  // Get shared data from store
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

  const handleMoveUp = useCallback(
    () => moveTarget(targetId, "up"),
    [moveTarget, targetId]
  );

  const handleMoveDown = useCallback(
    () => moveTarget(targetId, "down"),
    [moveTarget, targetId]
  );

  if (!target) {
    return null;
  }

  const contextKind = target.contextKind;
  const attributeKey = target.attributeKey ?? "";
  const attributeValue = target.attributeValue ?? "";

  const handleContextKindChange = (kind: ContextKind) => {
    updateTargetIndividual(targetId, kind, "", attributeValue);
  };

  const handleAttributeKeyChange = (key: string) => {
    updateTargetIndividual(targetId, contextKind, key, attributeValue);
  };

  const handleAttributeValueChange = (value: string) => {
    updateTargetIndividual(targetId, contextKind, attributeKey, value);
  };

  return (
    <TargetingCard
      isFirst={targetIndex === 0}
      isLast={targetIndex === targetsCount - 1}
      name={target.name}
      onDelete={handleDelete}
      onMoveDown={handleMoveDown}
      onMoveUp={handleMoveUp}
      onNameChange={handleNameChange}
      onVariationChange={handleVariationChange}
      selectedVariationId={target.variationId}
      targetId={targetId}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Text className="shrink-0 text-ui-fg-muted" size="small">
            Where
          </Text>
          <ContextSelect
            onChange={handleContextKindChange}
            value={contextKind}
          />
          <AttributeSelect
            contextKind={contextKind}
            onChange={handleAttributeKeyChange}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            value={attributeKey}
          />
        </div>
        <div className="flex flex-1 items-center gap-2">
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
      </div>
    </TargetingCard>
  );
}
