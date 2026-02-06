import { useCallback } from "react";
import { RuleConditionBuilder } from "./rule-condition-builder";
import TargetingCard from "./targeting-card";
import type { LocalRollout } from "./targeting-store";
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
  const updateTargetRollout = useTargetingStore((s) => s.updateTargetRollout);
  const setTargetMode = useTargetingStore((s) => s.setTargetMode);
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

  const handleRolloutChange = useCallback(
    (rollout: LocalRollout) => updateTargetRollout(targetId, rollout),
    [updateTargetRollout, targetId]
  );

  const handleModeChange = useCallback(
    (mode: "single" | "rollout") => setTargetMode(targetId, mode),
    [setTargetMode, targetId]
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
      onModeChange={handleModeChange}
      onMoveDown={handleMoveDown}
      onMoveUp={handleMoveUp}
      onNameChange={handleNameChange}
      onRolloutChange={handleRolloutChange}
      onVariationChange={handleVariationChange}
      rollout={target.rollout}
      selectedVariationId={target.variationId}
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
