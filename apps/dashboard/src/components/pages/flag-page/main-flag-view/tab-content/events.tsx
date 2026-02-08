import type { RouterOutputs } from "@gradual/api";
import { Badge } from "@gradual/ui/badge";
import { Card } from "@gradual/ui/card";
import { Text } from "@gradual/ui/text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import { useSuspenseQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
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

  const { data } = useSuspenseQuery(
    trpc.featureFlags.getEvents.queryOptions({
      flagId: flag.id,
      organizationSlug,
      projectSlug,
      environmentId,
    })
  );

  if (data.items.length === 0) {
    return (
      <div className="flex w-full flex-1 flex-col p-2">
        <Card className="flex h-full w-full flex-1 flex-col items-center justify-center p-8">
          <p className="text-ui-fg-muted">No evaluation events yet</p>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex w-full flex-1 flex-col p-2">
        <Card className="flex-1 p-0">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_80px_80px_80px_auto] gap-x-3 border-b px-4 py-2">
            <Text className="font-mono text-ui-fg-muted" size="xsmall">
              Variation
            </Text>
            <Text className="font-mono text-ui-fg-muted" size="xsmall">
              Value
            </Text>
            <Text className="font-mono text-ui-fg-muted" size="xsmall">
              Reason
            </Text>
            <Text className="font-mono text-ui-fg-muted" size="xsmall">
              Target
            </Text>
            <Text className="font-mono text-ui-fg-muted" size="xsmall">
              Duration
            </Text>
            <Text className="font-mono text-ui-fg-muted" size="xsmall">
              Platform
            </Text>
            <Text className="font-mono text-ui-fg-muted" size="xsmall">
              Version
            </Text>
            <Text className="font-mono text-ui-fg-muted" size="xsmall">
              Time
            </Text>
          </div>
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
            {data.items.map((event) => (
              <EventRow event={event} key={event.id} />
            ))}
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function EventRow({ event }: { event: EventItem }) {
  const reason = event.reason ?? "DEFAULT_VARIATION";

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_80px_80px_80px_auto] items-center gap-x-3 border-b px-4 py-2.5 last:border-b-0">
      <div className="flex items-center gap-1.5">
        <Text className="truncate font-mono" size="small">
          {event.variationName ?? "-"}
        </Text>
        {event.isAnonymous && (
          <Badge size="sm" variant="secondary">
            Anon
          </Badge>
        )}
      </div>
      <Text className="truncate font-mono" size="small">
        {event.value !== null && event.value !== undefined
          ? String(event.value)
          : "-"}
      </Text>
      <div className="flex items-center gap-1">
        {reason === "ERROR" && event.errorDetail ? (
          <Tooltip>
            <TooltipTrigger>
              <Badge size="sm" variant="error">
                {reasonLabels[reason] ?? reason}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{event.errorDetail}</TooltipContent>
          </Tooltip>
        ) : (
          <Badge size="sm" variant={reasonVariants[reason] ?? "outline"}>
            {reasonLabels[reason] ?? reason}
          </Badge>
        )}
      </div>
      <Text className="truncate font-mono text-ui-fg-muted" size="xsmall">
        {event.matchedTargetName ?? "-"}
      </Text>
      <Text className="font-mono text-ui-fg-muted" size="xsmall">
        {event.evaluationDurationUs != null
          ? formatDuration(event.evaluationDurationUs)
          : "-"}
      </Text>
      <Text className="font-mono text-ui-fg-muted" size="xsmall">
        {event.sdkPlatform ?? "-"}
      </Text>
      <Text className="font-mono text-ui-fg-muted" size="xsmall">
        {event.sdkVersion ?? "-"}
      </Text>
      <Tooltip>
        <TooltipTrigger>
          <Text className="font-mono text-ui-fg-muted" size="xsmall">
            {dayjs(event.createdAt).format("MMM D, HH:mm:ss")}
          </Text>
        </TooltipTrigger>
        <TooltipContent>
          {event.flagConfigVersion
            ? `Config version: ${event.flagConfigVersion}`
            : dayjs(event.createdAt).format("MMMM D, YYYY HH:mm:ss")}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
