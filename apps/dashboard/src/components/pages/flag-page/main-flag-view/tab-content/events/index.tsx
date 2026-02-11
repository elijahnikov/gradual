import type { RouterOutputs } from "@gradual/api";
import { Badge } from "@gradual/ui/badge";
import { Card } from "@gradual/ui/card";
import { Skeleton } from "@gradual/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gradual/ui/table";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useSubscription } from "@trpc/tanstack-react-query";
import dayjs from "dayjs";
import { AnimatePresence } from "motion/react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useInView } from "react-intersection-observer";
import { useTRPC } from "@/lib/trpc";
import EmptyEventsList from "./empty-state";
import EventDetailRow from "./event-detail-row";
import EventFilterBar from "./event-filter-bar";
import {
  isStructuredReason,
  type StructuredReason,
  summarizeReasons,
} from "./reason-utils";
import type { EventFilters } from "./types";

type Flag = RouterOutputs["featureFlags"]["getByKey"]["flag"];
type EventItem = RouterOutputs["featureFlags"]["getEvents"]["items"][number];

type Variation =
  RouterOutputs["featureFlags"]["getByKey"]["variations"][number];

interface FlagEventsProps {
  flag: Flag;
  organizationSlug: string;
  projectSlug: string;
  environmentId?: string;
  variations?: Variation[];
}

function isComplexValue(val: unknown): boolean {
  return typeof val === "object" && val !== null;
}

function formatDuration(us: number): string {
  return `${(us / 1000).toFixed(2)}ms`;
}

function truncateId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

function matchesFilters(event: EventItem, filters: EventFilters): boolean {
  if (
    filters.variationIds &&
    filters.variationIds.length > 0 &&
    !(event.variationId && filters.variationIds.includes(event.variationId))
  ) {
    return false;
  }
  if (filters.reasonTypes && filters.reasonTypes.length > 0) {
    const reasons = Array.isArray(event.reasons) ? event.reasons : [];
    const hasMatch = reasons.some(
      (r) =>
        isStructuredReason(r) &&
        filters.reasonTypes?.includes((r as StructuredReason).type)
    );
    if (!hasMatch) {
      return false;
    }
  }
  if (filters.targetNameSearch) {
    const search = filters.targetNameSearch.toLowerCase();
    if (!event.matchedTargetName?.toLowerCase().includes(search)) {
      return false;
    }
  }
  if (
    filters.minLatencyUs != null &&
    (event.evaluationDurationUs == null ||
      event.evaluationDurationUs < filters.minLatencyUs)
  ) {
    return false;
  }
  if (filters.sdkVersion && event.sdkVersion !== filters.sdkVersion) {
    return false;
  }
  if (filters.startDate) {
    const eventTime = new Date(event.createdAt).getTime();
    if (eventTime < new Date(filters.startDate).getTime()) {
      return false;
    }
  }
  if (filters.endDate) {
    const eventTime = new Date(event.createdAt).getTime();
    if (eventTime >= new Date(filters.endDate).getTime()) {
      return false;
    }
  }
  return true;
}

function hasActiveFilters(filters: EventFilters): boolean {
  return Boolean(
    (filters.variationIds && filters.variationIds.length > 0) ||
      (filters.reasonTypes && filters.reasonTypes.length > 0) ||
      filters.targetNameSearch ||
      filters.minLatencyUs != null ||
      filters.sdkVersion ||
      filters.startDate ||
      filters.endDate
  );
}

const columnHelper = createColumnHelper<EventItem>();

const columns = [
  columnHelper.accessor("traceId", {
    header: "Decision",
    cell: (info) => {
      const traceId = info.getValue();
      const id = traceId ?? info.row.original.id;
      return (
        <span className="truncate font-mono text-ui-fg-muted text-xs">
          {truncateId(id)}
        </span>
      );
    },
  }),
  columnHelper.accessor("variationName", {
    header: "Result",
    cell: (info) => {
      const row = info.row.original;
      return (
        <div className="flex items-center gap-1.5">
          {row.variationColor && (
            <span
              className="size-2.5 shrink-0 rounded-[4px]"
              style={{ backgroundColor: row.variationColor }}
            />
          )}
          <span className="truncate font-mono text-xs">
            {info.getValue() ?? "-"}
          </span>
          {isComplexValue(row.value) && (
            <Badge
              className="px-1 py-0 font-mono text-[10px]"
              size="sm"
              variant="outline"
            >
              JSON
            </Badge>
          )}
          {row.isAnonymous && (
            <Badge size="sm" variant="secondary">
              Anon
            </Badge>
          )}
        </div>
      );
    },
  }),
  columnHelper.accessor("reasons", {
    header: "Reason",
    cell: (info) => {
      const structuredReasons = info.getValue();

      if (
        Array.isArray(structuredReasons) &&
        structuredReasons.length > 0 &&
        structuredReasons.every(isStructuredReason)
      ) {
        const { label, variant } = summarizeReasons(structuredReasons);
        return (
          <Badge size="default" variant={variant}>
            {label}
          </Badge>
        );
      }

      return (
        <Badge size="default" variant="outline">
          Unknown
        </Badge>
      );
    },
  }),
  columnHelper.accessor("matchedTargetName", {
    header: "Rule",
    cell: (info) => (
      <span className="max-w-[160px] truncate font-mono text-ui-fg-muted text-xs">
        {info.getValue() ?? "-"}
      </span>
    ),
  }),
  columnHelper.accessor("evaluationDurationUs", {
    header: "Latency",
    cell: (info) => {
      const val = info.getValue();
      return (
        <span className="font-mono text-ui-fg-muted text-xs">
          {val != null ? formatDuration(val) : "-"}
        </span>
      );
    },
  }),
  columnHelper.accessor("createdAt", {
    header: "Time",
    cell: (info) => (
      <span className="font-mono text-ui-fg-muted text-xs">
        {dayjs(info.getValue()).format("HH:mm:ss")}
      </span>
    ),
  }),
];

export default function FlagEvents({
  flag,
  organizationSlug,
  projectSlug,
  environmentId,
  variations,
}: FlagEventsProps) {
  const [filters, setFilters] = useState<EventFilters>({});

  if (!environmentId) {
    return (
      <div className="flex w-full flex-1 flex-col p-2">
        <Card className="flex h-full w-full flex-1 flex-col items-center justify-center p-8">
          <p className="text-ui-fg-muted">
            Select an environment to view events
          </p>
        </Card>
      </div>
    );
  }

  return (
    <>
      <EventFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        variations={variations ?? []}
      />
      <FlagEventsContent
        environmentId={environmentId}
        filters={filters}
        flag={flag}
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
      />
    </>
  );
}

const PAGE_SIZE = 50;

interface FlagEventsContentProps {
  flag: Flag;
  organizationSlug: string;
  projectSlug: string;
  environmentId: string;
  filters: EventFilters;
}

function FlagEventsContent({
  flag,
  organizationSlug,
  projectSlug,
  environmentId,
  filters,
}: FlagEventsContentProps) {
  const trpc = useTRPC();
  const [liveEvents, setLiveEvents] = useState<EventItem[]>([]);
  const seenIdsRef = useRef(new Set<string>());
  const liveIdsRef = useRef(new Set<string>());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery(
      trpc.featureFlags.getEvents.infiniteQueryOptions(
        {
          flagId: flag.id,
          organizationSlug,
          projectSlug,
          environmentId,
          limit: PAGE_SIZE,
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

  const allHistorical = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data?.pages]
  );

  const onData = useCallback((event: EventItem) => {
    if (seenIdsRef.current.has(event.id)) {
      return;
    }
    seenIdsRef.current.add(event.id);
    liveIdsRef.current.add(event.id);
    setLiveEvents((prev) => [event, ...prev]);
  }, []);

  useSubscription(
    trpc.featureFlags.watchEvents.subscriptionOptions(
      {
        flagId: flag.id,
        organizationSlug,
        projectSlug,
        environmentId,
      },
      {
        enabled: true,
        onData,
      }
    )
  );

  const mergedEvents = useMemo(() => {
    const historicalIds = new Set(allHistorical.map((item) => item.id));
    const uniqueLive = liveEvents.filter(
      (event) => !historicalIds.has(event.id)
    );
    const all = [...uniqueLive, ...allHistorical];
    if (!hasActiveFilters(filters)) {
      return all;
    }
    return all.filter((event) => matchesFilters(event, filters));
  }, [liveEvents, allHistorical, filters]);

  const table = useReactTable({
    data: mergedEvents,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return <EventsTableSkeleton />;
  }

  if (mergedEvents.length === 0 && !hasActiveFilters(filters)) {
    return <EmptyEventsList />;
  }

  if (mergedEvents.length === 0 && hasActiveFilters(filters)) {
    return (
      <div className="flex w-full flex-1 flex-col items-center justify-center p-8">
        <p className="text-sm text-ui-fg-muted">
          No events match the current filters
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-auto">
      <Table className="border-b">
        <TableHeader className="sticky top-0 z-10 bg-ui-bg-subtle">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  <span className="text-xs">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            const isLive = liveIdsRef.current.has(row.original.id);
            const isSelected = selectedEventId === row.original.id;
            return (
              <Fragment key={row.id}>
                <TableRow
                  className={`cursor-pointer transition-colors hover:bg-ui-bg-field-hover ${isSelected ? "bg-ui-bg-field" : ""}`}
                  onAnimationEnd={() => {
                    liveIdsRef.current.delete(row.original.id);
                  }}
                  onClick={() =>
                    setSelectedEventId((prev) =>
                      prev === row.original.id ? null : row.original.id
                    )
                  }
                  style={
                    isLive
                      ? {
                          animation: "row-flash 1.5s ease-out",
                        }
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
                <AnimatePresence>
                  {isSelected && <EventDetailRow event={row.original} />}
                </AnimatePresence>
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
      {hasNextPage && (
        <div className="flex justify-center py-4" ref={loadMoreRef}>
          {isFetchingNextPage && <Skeleton className="h-8 w-32" />}
        </div>
      )}
    </div>
  );
}

function EventsTableSkeleton() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="flex border-b bg-ui-bg-subtle">
        {["w-20", "w-14", "w-16", "w-14", "w-16", "w-12"].map((w, i) => (
          <div className="flex-1 px-3 py-2" key={i}>
            <Skeleton className={`h-3 ${w}`} />
          </div>
        ))}
      </div>
      <div className="flex flex-1 flex-col">
        {Array.from({ length: 20 }).map((_, rowIdx) => (
          <div className="flex border-b" key={rowIdx}>
            {["w-20", "w-14", "w-16", "w-14", "w-16", "w-12"].map(
              (w, colIdx) => (
                <div className="flex-1 px-3 py-2.5" key={colIdx}>
                  <Skeleton className={`h-3.5 ${w}`} />
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
