import { Skeleton } from "@gradual/ui/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKeyPress } from "@/lib/hooks/use-key-press";
import { useSelectedFlagsStore } from "@/lib/stores/selected-flags-store";
import { useTRPC } from "@/lib/trpc";
import EmptyFlagsList from "./empty-state";
import FlagListItem from "./flag-list-item";
import FlagsPagination from "./flags-list-pagination";
import { flagsSearchParams } from "./flags-search-params";
import NoResultsState from "./no-results-state";
import SelectedFlagsActions from "./selected-flags-actions";

interface FlagsListProps {
  projectSlug: string;
  organizationSlug: string;
}

const PAGE_SIZE = 2;

interface Cursor {
  value: string | number;
  id: string;
}

export default function FlagsList({
  projectSlug,
  organizationSlug,
}: FlagsListProps) {
  const trpc = useTRPC();
  const [{ sortBy, sortOrder, search }] = useQueryStates(flagsSearchParams);

  const { setSelectedFlags, clearSelectedFlags, selectedFlags } =
    useSelectedFlagsStore();

  const [page, setPage] = useState(1);
  const [cursorHistory, setCursorHistory] = useState<Map<number, Cursor>>(
    () => new Map()
  );

  const prevFiltersRef = useRef({ sortBy, sortOrder, search });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      prev.sortBy !== sortBy ||
      prev.sortOrder !== sortOrder ||
      prev.search !== search
    ) {
      setCursorHistory(new Map());
      setPage(1);
    }
    prevFiltersRef.current = { sortBy, sortOrder, search };
  }, [sortBy, sortOrder, search]);

  const cursor = cursorHistory.get(page);

  const { data } = useSuspenseQuery(
    trpc.featureFlags.getAll.queryOptions({
      projectSlug,
      organizationSlug,
      limit: PAGE_SIZE,
      sortBy,
      sortOrder,
      cursor,
      search: search || undefined,
    })
  );

  const totalPages = useMemo(
    () => Math.ceil(data.total / PAGE_SIZE),
    [data.total]
  );

  const hasNextPage = !!data.nextCursor;

  const goToNextPage = useCallback(() => {
    if (data.nextCursor && page < totalPages) {
      setCursorHistory((prev) =>
        new Map(prev).set(page + 1, data.nextCursor as Cursor)
      );
      setPage(page + 1);
    }
  }, [data.nextCursor, page, totalPages]);

  const goToPrevPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page]);

  const goToPage = useCallback(
    (targetPage: number) => {
      if (targetPage === 1) {
        setPage(1);
      } else if (targetPage <= page) {
        setPage(targetPage);
      } else if (targetPage === page + 1 && data.nextCursor) {
        goToNextPage();
      }
    },
    [page, data.nextCursor, goToNextPage]
  );

  const allFlags = useMemo(() => data.items, [data.items]);

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

  useKeyPress("a", handleSelectAll);
  useKeyPress("Escape", handleClearSelection);

  if (data.items.length === 0 && page === 1) {
    if (search) {
      return <NoResultsState />;
    }
    return <EmptyFlagsList />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="divide-y">
        {data.items.map((item) => (
          <FlagListItem flag={item} key={item.featureFlag.id} />
        ))}
      </div>
      {totalPages > 1 && (
        <FlagsPagination
          currentPage={page}
          hasNextPage={hasNextPage}
          onGoToPage={goToPage}
          onNextPage={goToNextPage}
          onPrevPage={goToPrevPage}
          totalPages={totalPages}
        />
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
