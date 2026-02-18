import type { RouterOutputs } from "@gradual/api";
import { cn } from "@gradual/ui";
import { Checkbox } from "@gradual/ui/checkbox";
import { Text } from "@gradual/ui/text";
import { Link, useParams } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { useSelectedSegmentsStore } from "@/lib/stores/selected-segments-store";
import SegmentListItemStats from "./stats";

type SegmentListItemData = RouterOutputs["segments"]["list"]["items"][number];

export default function SegmentListItem({
  segment,
}: {
  segment: SegmentListItemData;
}) {
  const { organizationSlug, projectSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/segments/",
  });

  const selectedSegments = useSelectedSegmentsStore(
    (state) => state.selectedSegments
  );
  const setSelectedSegments = useSelectedSegmentsStore(
    (state) => state.setSelectedSegments
  );

  const handleSelectSegment = useCallback(
    (segmentId: string) => {
      const current = useSelectedSegmentsStore.getState().selectedSegments;
      if (current.some((s) => s.id === segmentId)) {
        setSelectedSegments(current.filter((s) => s.id !== segmentId));
      } else {
        setSelectedSegments([
          ...current,
          {
            id: segmentId,
            key: segment.key,
            name: segment.name,
          },
        ]);
      }
    },
    [setSelectedSegments, segment.key, segment.name]
  );

  const isSelected = useMemo(
    () => selectedSegments.some((s) => s.id === segment.id),
    [selectedSegments, segment.id]
  );

  return (
    <div
      className="group/segment flex h-16 items-center border-0 px-4 data-[selected=true]:bg-ui-button-recall/10"
      data-selected={isSelected}
    >
      {/** biome-ignore lint/a11y/noNoninteractiveElementInteractions: <> */}
      {/** biome-ignore lint/a11y/useKeyWithClickEvents: <> */}
      {/** biome-ignore lint/a11y/noStaticElementInteractions: <> */}
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <Checkbox
          checked={isSelected}
          className={cn(
            "mt-[3.5px] mr-3 opacity-0 transition-opacity duration-200 ease-in-out group-hover/segment:opacity-100",
            isSelected && "opacity-100"
          )}
          data-checked={isSelected}
          onCheckedChange={() => handleSelectSegment(segment.id)}
        />
      </div>
      <div className="flex flex-col gap-y-0.5">
        <Link
          params={{
            organizationSlug,
            projectSlug,
            segmentSlug: segment.key,
          }}
          preload="intent"
          search={{}}
          to="/$organizationSlug/$projectSlug/segments/$segmentSlug"
        >
          <Text
            className="cursor-pointer text-[14px] hover:underline"
            weight="plus"
          >
            {segment.name}
          </Text>
        </Link>
        <SegmentListItemStats
          conditionCount={segment.conditions?.length ?? 0}
          createdAt={segment.createdAt}
          flagCount={segment.flagCount}
          segmentKey={segment.key}
        />
      </div>
    </div>
  );
}
