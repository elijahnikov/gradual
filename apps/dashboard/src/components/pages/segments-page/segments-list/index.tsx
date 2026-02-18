import { Separator } from "@gradual/ui/separator";
import { Skeleton } from "@gradual/ui/skeleton";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import React, { useCallback, useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { useSelectedSegmentsStore } from "@/lib/stores/selected-segments-store";
import { useTRPC } from "@/lib/trpc";
import EmptySegmentsList from "./empty-state";
import NoResultsState from "./no-results-state";
import SegmentListItem from "./segment-list-item";
import { segmentsSearchParams } from "./segments-search-params";
import SelectedSegmentsActions from "./selected-segments-actions";

interface SegmentsListProps {
  projectSlug: string;
  organizationSlug: string;
}

const PAGE_SIZE = 20;

export default function SegmentsList({
  projectSlug,
  organizationSlug,
}: SegmentsListProps) {
  const trpc = useTRPC();
  const [{ sortBy, sortOrder, search }] = useQueryStates(segmentsSearchParams);

  const { setSelectedSegments, clearSelectedSegments, selectedSegments } =
    useSelectedSegmentsStore();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.segments.list.infiniteQueryOptions(
        {
          projectSlug,
          organizationSlug,
          limit: PAGE_SIZE,
          sortBy,
          sortOrder,
          search: search || undefined,
        },
        {
          getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        }
      )
    );

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allSegments = useMemo(
    () => data.pages.flatMap((page) => page.items),
    [data.pages]
  );

  const handleSelectAll = useCallback(
    (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey
      ) {
        const target = event.target as HTMLElement;
        const isInputField =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;

        if (!isInputField) {
          event.preventDefault();
          const currentSelectedSegments = selectedSegments;
          const allSelected =
            allSegments.length > 0 &&
            allSegments.every((seg) =>
              currentSelectedSegments.some((s) => s.id === seg.id)
            );

          if (allSelected) {
            clearSelectedSegments();
          } else {
            setSelectedSegments(
              allSegments.map((seg) => ({
                id: seg.id,
                key: seg.key,
                name: seg.name,
              }))
            );
          }
        }
      }
    },
    [selectedSegments, setSelectedSegments, clearSelectedSegments, allSegments]
  );

  const handleClearSelection = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (!isInputField && selectedSegments.length > 0) {
        event.preventDefault();
        clearSelectedSegments();
      }
    },
    [selectedSegments.length, clearSelectedSegments]
  );

  useHotkey("Mod+A", handleSelectAll);
  useHotkey("Escape", handleClearSelection);

  if (allSegments.length === 0) {
    if (search) {
      return <NoResultsState />;
    }
    return <EmptySegmentsList />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col">
        {allSegments.map((item) => (
          <React.Fragment key={item.id}>
            <SegmentListItem segment={item} />
            <Separator />
          </React.Fragment>
        ))}
      </div>
      {hasNextPage && (
        <div className="flex justify-center py-4" ref={loadMoreRef}>
          {isFetchingNextPage && <Skeleton className="h-8 w-32" />}
        </div>
      )}
      {selectedSegments.length > 0 && (
        <SelectedSegmentsActions
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
        />
      )}
    </div>
  );
}

export function SegmentsListSkeleton() {
  return (
    <div className="my-2 flex flex-col gap-y-2 px-2">
      {Array.from({ length: 12 }).map((_, index) => (
        <Skeleton className="h-12 w-full" key={index} />
      ))}
    </div>
  );
}
