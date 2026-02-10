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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useSubscription } from "@trpc/tanstack-react-query";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useTRPC } from "@/lib/trpc";
import EmptyEventsList from "./empty-state";

type Flag = RouterOutputs["featureFlags"]["getByKey"]["flag"];
type EventItem = RouterOutputs["featureFlags"]["getEvents"]["items"][number];

interface FlagEventsProps {
  flag: Flag;
  organizationSlug: string;
  projectSlug: string;
  environmentId?: string;
}

const reasonLabels: Record<string, string> = {
  FLAG_DISABLED: "Disabled",
  TARGET_MATCH: "Target match",
  DEFAULT_ROLLOUT: "Default rollout",
  DEFAULT_VARIATION: "Default",
  FLAG_NOT_FOUND: "Not found",
  ERROR: "Error",
};

const reasonVariants: Record<
  string,
  "secondary" | "success" | "warning" | "error" | "info" | "outline"
> = {
  FLAG_DISABLED: "secondary",
  TARGET_MATCH: "success",
  DEFAULT_ROLLOUT: "info",
  DEFAULT_VARIATION: "outline",
  FLAG_NOT_FOUND: "warning",
  ERROR: "error",
};

interface StructuredReason {
  type: string;
  ruleId?: string;
  ruleName?: string;
  percentage?: number;
  bucket?: number;
  detail?: string;
}

function isStructuredReason(v: unknown): v is StructuredReason {
  return typeof v === "object" && v !== null && "type" in v;
}

const structuredReasonVariants: Record<
  string,
  "secondary" | "success" | "warning" | "error" | "info" | "outline"
> = {
  rule_match: "success",
  percentage_rollout: "info",
  default: "outline",
  off: "secondary",
  error: "error",
};

function formatStructuredReason(reason: StructuredReason): string {
  switch (reason.type) {
    case "rule_match":
      return reason.ruleName ? `Rule: ${reason.ruleName}` : "Rule match";
    case "percentage_rollout":
      return reason.percentage != null
        ? `Rollout: ${(reason.percentage / 100).toFixed(1)}%`
        : "Rollout";
    case "default":
      return "Default";
    case "off":
      return "Disabled";
    case "error":
      return reason.detail ? `Error: ${reason.detail}` : "Error";
    default:
      return reason.type;
  }
}

function formatDuration(us: number): string {
  return `${(us / 1000).toFixed(2)}ms`;
}

const columnHelper = createColumnHelper<EventItem>();

const columns = [
  columnHelper.accessor("variationName", {
    header: "Variation",
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
          {row.isAnonymous && (
            <Badge size="sm" variant="secondary">
              Anon
            </Badge>
          )}
        </div>
      );
    },
  }),
  columnHelper.accessor("value", {
    header: "Value",
    cell: (info) => {
      const val = info.getValue();
      return (
        <span className="truncate font-mono text-xs">
          {val !== null && val !== undefined ? String(val) : "-"}
        </span>
      );
    },
  }),
  columnHelper.accessor("reason", {
    header: "Reason",
    cell: (info) => {
      const row = info.row.original;
      const structuredReasons = row.reasons;

      if (
        Array.isArray(structuredReasons) &&
        structuredReasons.length > 0 &&
        structuredReasons.every(isStructuredReason)
      ) {
        return (
          <div className="flex flex-wrap items-center gap-1">
            {structuredReasons.map((r, i) => {
              const label = formatStructuredReason(r);
              const variant = structuredReasonVariants[r.type] ?? "outline";

              if (r.type === "error" && r.detail) {
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger>
                      <Badge size="sm" variant={variant}>
                        {label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{r.detail}</TooltipContent>
                  </Tooltip>
                );
              }

              if (r.type === "percentage_rollout" && r.bucket != null) {
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger>
                      <Badge size="sm" variant={variant}>
                        {label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      Bucket: {r.bucket.toLocaleString()}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Badge key={i} size="sm" variant={variant}>
                  {label}
                </Badge>
              );
            })}
          </div>
        );
      }

      // Fallback: legacy string reason
      const reason = info.getValue() ?? "DEFAULT_VARIATION";
      if (reason === "ERROR" && row.errorDetail) {
        return (
          <Tooltip>
            <TooltipTrigger>
              <Badge size="sm" variant="error">
                {reasonLabels[reason] ?? reason}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{row.errorDetail}</TooltipContent>
          </Tooltip>
        );
      }
      return (
        <Badge size="sm" variant={reasonVariants[reason] ?? "outline"}>
          {reasonLabels[reason] ?? reason}
        </Badge>
      );
    },
  }),
  columnHelper.accessor("matchedTargetName", {
    header: "Target",
    cell: (info) => (
      <span className="truncate font-mono text-ui-fg-muted text-xs">
        {info.getValue() ?? "-"}
      </span>
    ),
  }),
  columnHelper.accessor("evaluationDurationUs", {
    header: "Duration",
    cell: (info) => {
      const val = info.getValue();
      return (
        <span className="font-mono text-ui-fg-muted text-xs">
          {val != null ? formatDuration(val) : "-"}
        </span>
      );
    },
  }),
  columnHelper.accessor("sdkPlatform", {
    header: "Platform",
    cell: (info) => (
      <span className="font-mono text-ui-fg-muted text-xs">
        {info.getValue() ?? "-"}
      </span>
    ),
  }),
  columnHelper.accessor("sdkVersion", {
    header: "Version",
    cell: (info) => (
      <span className="font-mono text-ui-fg-muted text-xs">
        {info.getValue() ?? "-"}
      </span>
    ),
  }),
  columnHelper.accessor("createdAt", {
    header: "Time",
    cell: (info) => {
      const row = info.row.original;
      return (
        <Tooltip>
          <TooltipTrigger>
            <span className="font-mono text-ui-fg-muted text-xs">
              {dayjs(info.getValue()).format("MMM D, HH:mm:ss")}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {row.flagConfigVersion
              ? `Config version: ${row.flagConfigVersion}`
              : dayjs(info.getValue()).format("MMMM D, YYYY HH:mm:ss")}
          </TooltipContent>
        </Tooltip>
      );
    },
  }),
];

export default function FlagEvents({
  flag,
  organizationSlug,
  projectSlug,
  environmentId,
}: FlagEventsProps) {
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
    <FlagEventsContent
      environmentId={environmentId}
      flag={flag}
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
    />
  );
}

const PAGE_SIZE = 50;

function FlagEventsContent({
  flag,
  organizationSlug,
  projectSlug,
  environmentId,
}: FlagEventsProps & { environmentId: string }) {
  const trpc = useTRPC();
  const [liveEvents, setLiveEvents] = useState<EventItem[]>([]);
  const seenIdsRef = useRef(new Set<string>());
  const liveIdsRef = useRef(new Set<string>());

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
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
    () => data.pages.flatMap((page) => page.items),
    [data.pages]
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
    return [...uniqueLive, ...allHistorical];
  }, [liveEvents, allHistorical]);

  const table = useReactTable({
    data: mergedEvents,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });

  if (mergedEvents.length === 0) {
    return <EmptyEventsList />;
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-auto">
        <Table>
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
              return (
                <TableRow
                  key={row.id}
                  onAnimationEnd={() => {
                    liveIdsRef.current.delete(row.original.id);
                  }}
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
    </TooltipProvider>
  );
}
