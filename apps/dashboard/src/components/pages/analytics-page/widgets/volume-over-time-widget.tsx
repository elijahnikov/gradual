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

function formatYAxis(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return String(value);
}

export default function VolumeOverTimeWidget() {
  const trpc = useTRPC();
  const organizationSlug = useAnalyticsStore((s) => s.organizationSlug);
  const projectSlug = useAnalyticsStore((s) => s.projectSlug);
  const dateRange = useAnalyticsStore((s) => s.dateRange);
  const environmentIds = useAnalyticsStore((s) => s.selectedEnvironmentIds);
  const flagIds = useAnalyticsStore((s) => s.selectedFlagIds);

  const { data } = useSuspenseQuery(
    trpc.analytics.getVolumeOverTime.queryOptions({
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
    evaluations: point.count,
  }));

  const chartConfig: ChartConfig = {
    evaluations: {
      label: "Evaluations",
      color: "var(--chart-1)",
    },
  };

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-ui-fg-muted">
        No data available for the selected time range
      </div>
    );
  }

  return (
    <ChartContainer
      className="h-full max-h-[350px] min-h-[350px] w-full"
      config={chartConfig}
    >
      <AreaChart
        accessibilityLayer
        data={chartData}
        margin={{ top: 0, right: 5, bottom: -10, left: -15 }}
      >
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
          tickFormatter={formatYAxis}
          tickLine={false}
          width={48}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="evaluations"
          fill="var(--chart-1)"
          fillOpacity={0.1}
          isAnimationActive={false}
          stroke="var(--chart-1)"
          strokeWidth={2}
          type="monotone"
        />
      </AreaChart>
    </ChartContainer>
  );
}
