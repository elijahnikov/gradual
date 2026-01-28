import { Text } from "@gradual/ui/text";
import { useState } from "react";
import { SegmentSelect } from "./segment-select";
import TargetingCard from "./targeting-card";
import type { Segment, Variation } from "./types";

interface SegmentTargetCardProps {
  name: string;
  onNameChange: (name: string) => void;
  variations: Variation[];
  segments: Segment[];
  selectedVariationId: string;
  initialSegmentId?: string;
  projectSlug: string;
  organizationSlug: string;
  onVariationChange: (variationId: string) => void;
  onSegmentChange: (segmentId: string) => void;
  onDelete: () => void;
}

export function SegmentTargetCard({
  name,
  onNameChange,
  variations,
  segments,
  selectedVariationId,
  initialSegmentId,
  projectSlug,
  organizationSlug,
  onVariationChange,
  onSegmentChange,
  onDelete,
}: SegmentTargetCardProps) {
  const [segmentId, setSegmentId] = useState(
    initialSegmentId ?? segments[0]?.id ?? ""
  );

  const handleSegmentChange = (id: string) => {
    setSegmentId(id);
    onSegmentChange(id);
  };

  const selectedSegment = segments.find((s) => s.id === segmentId);

  return (
    <TargetingCard
      name={name}
      onDelete={onDelete}
      onNameChange={onNameChange}
      onVariationChange={onVariationChange}
      selectedVariationId={selectedVariationId}
      type="segment"
      variations={variations}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Text className="shrink-0 text-ui-fg-muted" size="small">
            Users in segment
          </Text>
          <SegmentSelect
            onChange={handleSegmentChange}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            segments={segments}
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
