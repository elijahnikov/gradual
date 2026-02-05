import { useCallback } from "react";
import { RuleConditionBuilder } from "./rule-condition-builder";
import TargetingCard from "./targeting-card";
import { useTargetingStore } from "./targeting-store";
import type { RuleCondition } from "./types";

interface RuleTargetCardProps {
  targetId: string;
}

export function RuleTargetCard({ targetId }: RuleTargetCardProps) {
  const target = useTargetingStore((s) =>
    s.targets.find((t) => t.id === targetId)
  );

  const targetIndex = useTargetingStore((s) =>
    s.targets.findIndex((t) => t.id === targetId)
  );
  const targetsCount = useTargetingStore((s) => s.targets.length);

  const updateTargetName = useTargetingStore((s) => s.updateTargetName);
  const updateTargetVariation = useTargetingStore(
    (s) => s.updateTargetVariation
  );
  const updateTargetConditions = useTargetingStore(
    (s) => s.updateTargetConditions
  );
  const deleteTarget = useTargetingStore((s) => s.deleteTarget);
  const moveTarget = useTargetingStore((s) => s.moveTarget);

  const attributes = useTargetingStore((s) => s.attributes);
  const organizationSlug = useTargetingStore((s) => s.organizationSlug);
  const projectSlug = useTargetingStore((s) => s.projectSlug);

  const handleNameChange = useCallback(
    (name: string) => updateTargetName(targetId, name),
    [updateTargetName, targetId]
  );

  const handleVariationChange = useCallback(
    (variationId: string) => updateTargetVariation(targetId, variationId),
    [updateTargetVariation, targetId]
  );

  const handleConditionsChange = useCallback(
    (conditions: RuleCondition[]) =>
      updateTargetConditions(targetId, conditions),
    [updateTargetConditions, targetId]
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

  const conditions =
    target.conditions && target.conditions.length > 0
      ? target.conditions
      : [
          {
            contextKind: "user",
            attributeKey: attributes[0]?.key ?? "",
            operator: "equals" as const,
            value: "",
          },
        ];

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
      <RuleConditionBuilder
        conditions={conditions}
        onChange={handleConditionsChange}
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
      />
    </TargetingCard>
  );
}
