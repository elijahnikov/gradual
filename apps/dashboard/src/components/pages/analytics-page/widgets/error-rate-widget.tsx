import { Text } from "@gradual/ui/text";
import { RiArrowDownLine, RiArrowUpLine } from "@remixicon/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { useAnalyticsStore } from "../analytics-store";

function computeTrend(
  current: number,
  previous: number
): { value: number; direction: "up" | "down" | "neutral" } {
  if (previous === 0) {
    return {
      value: current > 0 ? 100 : 0,
      direction: current > 0 ? "up" : "neutral",
    };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(change),
    direction: change > 0 ? "up" : change < 0 ? "down" : "neutral",
  };
}

export default function ErrorRateWidget() {
  const trpc = useTRPC();
  const organizationSlug = useAnalyticsStore((s) => s.organizationSlug);
  const projectSlug = useAnalyticsStore((s) => s.projectSlug);
  const dateRange = useAnalyticsStore((s) => s.dateRange);
  const environmentIds = useAnalyticsStore((s) => s.selectedEnvironmentIds);
  const flagIds = useAnalyticsStore((s) => s.selectedFlagIds);

  const { data } = useSuspenseQuery(
    trpc.analytics.getOverview.queryOptions({
      organizationSlug,
      projectSlug,
      startDate: dateRange.from,
      endDate: dateRange.to,
      environmentIds: environmentIds.length > 0 ? environmentIds : undefined,
      flagIds: flagIds.length > 0 ? flagIds : undefined,
    })
  );

  const errorRate =
    data.current.totalEvaluations > 0
      ? (data.current.errorCount / data.current.totalEvaluations) * 100
      : 0;

  const previousErrorRate =
    data.previous.totalEvaluations > 0
      ? (data.previous.errorCount / data.previous.totalEvaluations) * 100
      : 0;

  const trend = computeTrend(errorRate, previousErrorRate);

  return (
    <div className="flex h-full flex-col justify-center">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-4xl tracking-tight">
          {errorRate.toFixed(2)}%
        </span>
        {trend.direction !== "neutral" && (
          <span
            className={`flex items-center text-sm ${
              trend.direction === "up" ? "text-red-600" : "text-green-600"
            }`}
          >
            {trend.direction === "up" ? (
              <RiArrowUpLine className="size-3.5" />
            ) : (
              <RiArrowDownLine className="size-3.5" />
            )}
            {trend.value.toFixed(1)}%
          </span>
        )}
      </div>
      <Text className="text-ui-fg-muted" size="xsmall">
        {data.current.errorCount} errors / {data.current.totalEvaluations} total
      </Text>
    </div>
  );
}
