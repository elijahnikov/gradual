import { Button } from "@gradual/ui/button";
import { Separator } from "@gradual/ui/separator";
import { Skeleton } from "@gradual/ui/skeleton";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import React, { useCallback, useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { useSelectedFlagsStore } from "@/lib/stores/selected-flags-store";
import { useTRPC } from "@/lib/trpc";
import EmptyFlagsList from "./empty-state";
import FlagListItem from "./flag-list-item";
import { flagsSearchParams } from "./flags-search-params";
import NoResultsState from "./no-results-state";
import SelectedFlagsActions from "./selected-flags-actions";

interface FlagsListProps {
  projectSlug: string;
  organizationSlug: string;
}

const PAGE_SIZE = 10;

export default function FlagsList({
  projectSlug,
  organizationSlug,
}: FlagsListProps) {
  const trpc = useTRPC();
  const [{ sortBy, sortOrder, search }] = useQueryStates(flagsSearchParams);

  const { setSelectedFlags, clearSelectedFlags, selectedFlags } =
    useSelectedFlagsStore();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.featureFlags.getAll.infiniteQueryOptions(
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

  const allFlags = useMemo(
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
          const currentSelectedFlags = selectedFlags;
          const allSelected =
            allFlags.length > 0 &&
            allFlags.every((flag) =>
              currentSelectedFlags.some((f) => f.id === flag.featureFlag.id)
            );

          if (allSelected) {
            clearSelectedFlags();
          } else {
            setSelectedFlags(
              allFlags.map((flag) => ({
                id: flag.featureFlag.id,
                key: flag.featureFlag.key,
                name: flag.featureFlag.name,
              }))
            );
          }
        }
      }
    },
    [selectedFlags, setSelectedFlags, clearSelectedFlags, allFlags]
  );

  const handleClearSelection = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (!isInputField && selectedFlags.length > 0) {
        event.preventDefault();
        clearSelectedFlags();
      }
    },
    [selectedFlags.length, clearSelectedFlags]
  );

  const firstFlag = allFlags[0]?.featureFlag;
  const seedMutation = useMutation(
    trpc.featureFlags.seedEvaluations.mutationOptions()
  );

  useHotkey("Mod+A", handleSelectAll);
  useHotkey("Escape", handleClearSelection);

  if (allFlags.length === 0) {
    if (search) {
      return <NoResultsState />;
    }
    return <EmptyFlagsList />;
  }

  return (
    <div className="flex flex-1 flex-col">
      {firstFlag && (
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Button
            disabled={seedMutation.isPending}
            onClick={() =>
              seedMutation.mutate({
                flagId: firstFlag.id,
                organizationId: firstFlag.organizationId,
                projectId: firstFlag.projectId,
                count: 1000,
              })
            }
            size="small"
            variant="secondary"
          >
            {seedMutation.isPending
              ? "Seeding..."
              : `Seed 1k evals for "${firstFlag.name}"`}
          </Button>
          {seedMutation.isSuccess && (
            <span className="text-ui-fg-muted text-xs">Done!</span>
          )}
          {seedMutation.isError && (
            <span className="text-red-500 text-xs">
              {seedMutation.error.message}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-col">
        {allFlags.map((item, _index) => (
          <React.Fragment key={item.featureFlag.id}>
            <FlagListItem flag={item} key={item.featureFlag.id} />
            <Separator />
          </React.Fragment>
        ))}
      </div>
      {hasNextPage && (
        <div className="flex justify-center py-4" ref={loadMoreRef}>
          {isFetchingNextPage && <Skeleton className="h-8 w-32" />}
        </div>
      )}
      {selectedFlags.length > 0 && (
        <SelectedFlagsActions
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
        />
      )}
    </div>
  );
}

export function FlagsListSkeleton() {
  return (
    <div className="my-2 flex flex-col gap-y-2 px-2">
      {Array.from({ length: 12 }).map((_, index) => (
        <Skeleton className="h-12 w-full" key={index} />
      ))}
    </div>
  );
}
