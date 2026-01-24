import { Skeleton } from "@gradual/ui/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTRPC } from "@/lib/trpc";
import EmptyFlagsList from "./empty-state";
import FlagListItem from "./flag-list-item";
import FlagsPagination from "./flags-list-pagination";
import { flagsSearchParams } from "./flags-search-params";
import NoResultsState from "./no-results-state";

interface FlagsListProps {
  projectSlug: string;
  organizationSlug: string;
}

const PAGE_SIZE = 12;

interface Cursor {
  value: string | number;
  id: string;
}

export default function FlagsList({
  projectSlug,
  organizationSlug,
}: FlagsListProps) {
  const trpc = useTRPC();
  const [{ sortBy, sortOrder, page, search }, setQueryStates] =
    useQueryStates(flagsSearchParams);

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
      setQueryStates({ page: page + 1 });
    }
  }, [data.nextCursor, page, totalPages, setQueryStates]);

  const goToPrevPage = useCallback(() => {
    if (page > 1) {
      setQueryStates({ page: page - 1 });
    }
  }, [page, setQueryStates]);

  const goToPage = useCallback(
    (targetPage: number) => {
      if (targetPage === 1) {
        setQueryStates({ page: 1 });
      } else if (targetPage <= page) {
        setQueryStates({ page: targetPage });
      } else if (targetPage === page + 1 && data.nextCursor) {
        goToNextPage();
      }
    },
    [page, data.nextCursor, goToNextPage, setQueryStates]
  );

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
