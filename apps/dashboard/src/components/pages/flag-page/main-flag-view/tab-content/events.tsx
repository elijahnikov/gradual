import type { RouterOutputs } from "@gradual/api";
import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gradual/ui/table";
import { Text } from "@gradual/ui/text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useSubscription } from "@trpc/tanstack-react-query";
import dayjs from "dayjs";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTRPC } from "@/lib/trpc";

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

function formatDuration(us: number): string {
  if (us >= 1000) {
    return `${(us / 1000).toFixed(1)}ms`;
  }
  return `${us}us`;
}

const columnHelper = createColumnHelper<EventItem>();

const columns = [
  columnHelper.accessor("variationName", {
    header: "Variation",
    cell: (info) => {
      const row = info.row.original;
      return (
        <div className="flex items-center gap-1.5">
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
      const reason = info.getValue() ?? "DEFAULT_VARIATION";
      const row = info.row.original;
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

function FlagEventsContent({
  flag,
  organizationSlug,
  projectSlug,
  environmentId,
}: FlagEventsProps & { environmentId: string }) {
  const trpc = useTRPC();
  const [isLive, setIsLive] = useState(true);
  const [liveEvents, setLiveEvents] = useState<EventItem[]>([]);
  const seenIdsRef = useRef(new Set<string>());
  console.log({ flag, environmentId });
  const { data } = useSuspenseQuery(
    trpc.featureFlags.getEvents.queryOptions({
      flagId: flag.id,
      organizationSlug,
      projectSlug,
      environmentId,
    })
  );

  const onData = useCallback((event: EventItem) => {
    if (seenIdsRef.current.has(event.id)) {
      return;
    }
    seenIdsRef.current.add(event.id);
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
        enabled: isLive,
        onData,
      }
    )
  );

  const mergedEvents = useMemo(() => {
    const historicalIds = new Set(data.items.map((item) => item.id));
    const uniqueLive = liveEvents.filter(
      (event) => !historicalIds.has(event.id)
    );
    return [...uniqueLive, ...data.items];
  }, [liveEvents, data.items]);
  console.log({ mergedEvents });

  const table = useReactTable({
    data: mergedEvents,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (mergedEvents.length === 0) {
    return (
      <div className="flex w-full flex-1 flex-col p-2">
        <Card className="flex h-full w-full flex-1 flex-col items-center justify-center p-8">
          <Text className="text-ui-fg-muted">No evaluation events yet</Text>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex w-full flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            {liveEvents.length > 0 && (
              <Badge size="sm" variant="info">
                {liveEvents.length} new
              </Badge>
            )}
          </div>
          <Button
            onClick={() => setIsLive((prev) => !prev)}
            size="small"
            variant="secondary"
          >
            <span className="flex items-center gap-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  isLive ? "animate-pulse bg-green-500" : "bg-ui-fg-muted"
                }`}
              />
              {isLive ? "Live" : "Paused"}
            </span>
          </Button>
        </div>
        <div className="flex-1 overflow-hidden p-0">
          <div className="max-h-[calc(100vh-15rem)] overflow-auto">
            <Table>
              <TableHeader className="bg-ui-bg-subtle">
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
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
