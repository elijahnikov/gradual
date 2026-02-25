import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@gradual/ui/chart";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { useTRPC } from "@/lib/trpc";
import { useAnalyticsStore } from "../analytics-store";

function formatTimeLabel(isoString: string, granularity: string): string {
  const date = new Date(isoString);
  if (granularity === "day") {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
  return date.toLocaleTimeString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    hour12: true,
  });
}

function formatDuration(us: number): string {
  const ms = us / 1000;
  if (ms < 1) {
    return `${us.toFixed(0)}us`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(1)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

const chartConfig: ChartConfig = {
  p50: { label: "p50", color: "var(--chart-1)" },
  p95: { label: "p95", color: "var(--chart-2)" },
  p99: { label: "p99", color: "var(--chart-3)" },
};

export default function LatencyWidget() {
  const trpc = useTRPC();
  const organizationSlug = useAnalyticsStore((s) => s.organizationSlug);
  const projectSlug = useAnalyticsStore((s) => s.projectSlug);
  const dateRange = useAnalyticsStore((s) => s.dateRange);
  const environmentIds = useAnalyticsStore((s) => s.selectedEnvironmentIds);
  const flagIds = useAnalyticsStore((s) => s.selectedFlagIds);

  const { data } = useSuspenseQuery(
    trpc.analytics.getLatency.queryOptions({
      organizationSlug,
      projectSlug,
      startDate: dateRange.from,
      endDate: dateRange.to,
      environmentIds: environmentIds.length > 0 ? environmentIds : undefined,
      flagIds: flagIds.length > 0 ? flagIds : undefined,
    })
  );

  const chartData = data.data.map((point) => ({
    label: formatTimeLabel(point.time, data.granularity),
    p50: point.p50 ?? 0,
    p95: point.p95 ?? 0,
    p99: point.p99 ?? 0,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-ui-fg-muted">
        No latency data available
      </div>
    );
  }

  return (
    <ChartContainer
      className="h-full max-h-[220px] w-full"
      config={chartConfig}
    >
      <AreaChart
        accessibilityLayer
        data={chartData}
        margin={{ top: 4, right: 4, bottom: -10, left: -20 }}
      >
        <defs>
          <linearGradient id="gradP50" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradP95" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradP99" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          axisLine={false}
          dataKey="label"
          interval="preserveStartEnd"
          tick={{ fontSize: 11 }}
          tickLine={false}
          tickMargin={4}
        />
        <YAxis
          axisLine={false}
          tick={{ fontSize: 11 }}
          tickFormatter={formatDuration}
          tickLine={false}
          width={48}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-ui-fg-muted">{String(name)}</span>
                  <span className="font-medium font-mono">
                    {formatDuration(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <Area
          connectNulls
          dataKey="p99"
          dot={false}
          fill="url(#gradP99)"
          isAnimationActive={false}
          stroke="var(--chart-3)"
          strokeWidth={1.5}
          type="monotone"
        />
        <Area
          connectNulls
          dataKey="p95"
          dot={false}
          fill="url(#gradP95)"
          isAnimationActive={false}
          stroke="var(--chart-2)"
          strokeWidth={1.5}
          type="monotone"
        />
        <Area
          connectNulls
          dataKey="p50"
          dot={false}
          fill="url(#gradP50)"
          isAnimationActive={false}
          stroke="var(--chart-1)"
          strokeWidth={1.5}
          type="monotone"
        />
      </AreaChart>
    </ChartContainer>
  );
}
