import { Text } from "@gradual/ui/text";
import { useCallback } from "react";
import { SegmentSelect } from "./segment-select";
import TargetingCard from "./targeting-card";
import type { LocalRollout } from "./targeting-store";
import { useTargetingStore } from "./targeting-store";

interface SegmentTargetCardProps {
  targetId: string;
  hasError?: boolean;
}

export function SegmentTargetCard({
  targetId,
  hasError,
}: SegmentTargetCardProps) {
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
  const updateTargetSegment = useTargetingStore((s) => s.updateTargetSegment);
  const deleteTarget = useTargetingStore((s) => s.deleteTarget);
  const moveTarget = useTargetingStore((s) => s.moveTarget);

  const segments = useTargetingStore((s) => s.segments);
  const segmentsById = useTargetingStore((s) => s.segmentsById);
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

  const handleSegmentChange = useCallback(
    (segmentId: string) => updateTargetSegment(targetId, segmentId),
    [updateTargetSegment, targetId]
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

  const segmentId = target.segmentId ?? segments[0]?.id ?? "";

  const selectedSegment = segmentsById.get(segmentId);

  return (
    <TargetingCard
      hasError={hasError}
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
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Text className="shrink-0 text-ui-fg-muted" size="small">
            Users in segment
          </Text>
          <SegmentSelect
            onChange={handleSegmentChange}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            value={segmentId}
          />
        </div>
        {selectedSegment?.description && (
          <Text className="text-ui-fg-subtle" size="xsmall">
            {selectedSegment.description}
          </Text>
        )}
      </div>
    </TargetingCard>
  );
}
