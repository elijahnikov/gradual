import { getVariationColorByIndex } from "@gradual/api/utils";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@gradual/ui/chart";
import { Text } from "@gradual/ui/text";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { useTRPC } from "@/lib/trpc";
import { useAnalyticsStore } from "../analytics-store";

export default function VariantDistributionWidget() {
  const trpc = useTRPC();
  const organizationSlug = useAnalyticsStore((s) => s.organizationSlug);
  const projectSlug = useAnalyticsStore((s) => s.projectSlug);
  const dateRange = useAnalyticsStore((s) => s.dateRange);
  const environmentIds = useAnalyticsStore((s) => s.selectedEnvironmentIds);
  const flagIds = useAnalyticsStore((s) => s.selectedFlagIds);

  const { data } = useSuspenseQuery(
    trpc.analytics.getVariantDistribution.queryOptions({
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
        color: item.color ?? getVariationColorByIndex(i),
      };
    }
    return config;
  }, [data.data]);

  if (data.data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-ui-fg-muted">
        No variant data available
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ChartContainer className="mx-auto h-[180px] w-full" config={chartConfig}>
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Pie
            cx="50%"
            cy="50%"
            data={data.data}
            dataKey="count"
            innerRadius={50}
            isAnimationActive={false}
            nameKey="name"
            outerRadius={75}
          >
            {data.data.map((entry, index) => (
              <Cell
                fill={entry.color ?? getVariationColorByIndex(index)}
                key={entry.variationId ?? index}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {data.data.map((item, index) => (
          <div
            className="flex items-center gap-1.5"
            key={item.variationId ?? index}
          >
            <div
              className="size-2.5 rounded-full"
              style={{
                backgroundColor: item.color ?? getVariationColorByIndex(index),
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
