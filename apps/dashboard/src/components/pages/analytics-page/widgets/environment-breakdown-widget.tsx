import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@gradual/ui/chart";
import { Text } from "@gradual/ui/text";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { useTRPC } from "@/lib/trpc";
import { useAnalyticsStore } from "../analytics-store";

const ENV_FALLBACK_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
];

export default function EnvironmentBreakdownWidget() {
  const trpc = useTRPC();
  const organizationSlug = useAnalyticsStore((s) => s.organizationSlug);
  const projectSlug = useAnalyticsStore((s) => s.projectSlug);
  const dateRange = useAnalyticsStore((s) => s.dateRange);
  const environmentIds = useAnalyticsStore((s) => s.selectedEnvironmentIds);
  const flagIds = useAnalyticsStore((s) => s.selectedFlagIds);

  const { data } = useSuspenseQuery(
    trpc.analytics.getEnvironmentBreakdown.queryOptions({
      organizationSlug,
      projectSlug,
      startDate: dateRange.from,
      endDate: dateRange.to,
      environmentIds: environmentIds.length > 0 ? environmentIds : undefined,
      flagIds: flagIds.length > 0 ? flagIds : undefined,
    })
  );

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const [i, item] of data.data.entries()) {
      config[item.name] = {
        label: item.name,
        color:
          item.color ?? ENV_FALLBACK_COLORS[i % ENV_FALLBACK_COLORS.length],
      };
    }
    return config;
  }, [data.data]);

  const chartData = useMemo(() => {
    return data.data.map((item, i) => ({
      name: item.name,
      count: item.count,
      fill: item.color ?? ENV_FALLBACK_COLORS[i % ENV_FALLBACK_COLORS.length],
    }));
  }, [data.data]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-ui-fg-muted">
        No environment data available
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ChartContainer className="h-full w-full" config={chartConfig}>
        <BarChart
          accessibilityLayer
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <XAxis
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(value: number) => {
              if (value >= 1000) {
                return `${(value / 1000).toFixed(1)}K`;
              }
              return String(value);
            }}
            tickLine={false}
            tickMargin={4}
            type="number"
          />
          <YAxis
            axisLine={false}
            dataKey="name"
            tick={{ fontSize: 11 }}
            tickLine={false}
            tickMargin={4}
            type="category"
            width={64}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="count"
            isAnimationActive={false}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ChartContainer>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {data.data.map((item, i) => (
          <div className="flex items-center gap-1.5" key={item.environmentId}>
            <div
              className="size-2.5 rounded-full"
              style={{
                backgroundColor:
                  item.color ??
                  ENV_FALLBACK_COLORS[i % ENV_FALLBACK_COLORS.length],
              }}
            />
            <Text size="xsmall">
              {item.name} ({item.percentage.toFixed(1)}%)
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}
