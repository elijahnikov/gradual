import { useCallback } from "react";
import { RuleConditionBuilder } from "./rule-condition-builder";
import TargetingCard from "./targeting-card";
import { useTargetingStore } from "./targeting-store";
import type { RuleCondition } from "./types";

interface RuleTargetCardProps {
  targetId: string;
}

export function RuleTargetCard({ targetId }: RuleTargetCardProps) {
  // Get target data from store
  const target = useTargetingStore((s) =>
    s.targets.find((t) => t.id === targetId)
  );

  // Get stable action references from store (rerender-functional-setstate)
  const updateTargetName = useTargetingStore((s) => s.updateTargetName);
  const updateTargetVariation = useTargetingStore(
    (s) => s.updateTargetVariation
  );
  const updateTargetConditions = useTargetingStore(
    (s) => s.updateTargetConditions
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

  const handleConditionsChange = useCallback(
    (conditions: RuleCondition[]) =>
      updateTargetConditions(targetId, conditions),
    [updateTargetConditions, targetId]
  );

  const handleDelete = useCallback(
    () => deleteTarget(targetId),
    [deleteTarget, targetId]
  );

  if (!target) {
    return null;
  }

  const conditions =
    target.conditions && target.conditions.length > 0
      ? target.conditions
      : [
          {
            attributeKey: attributes[0]?.key ?? "",
            operator: "equals" as const,
            value: "",
          },
        ];

  return (
    <TargetingCard
      name={target.name}
      onDelete={handleDelete}
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
