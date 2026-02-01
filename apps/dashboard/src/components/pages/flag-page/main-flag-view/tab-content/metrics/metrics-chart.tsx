import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@gradual/ui/chart";
import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { useMetricsStore } from "./metrics-store";
import type { MetricsBucket, MetricsVariation } from "./types";

const VARIATION_COLORS = [
  "#32AA40", // Green
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
];

interface MetricsChartProps {
  data: MetricsBucket[];
  variations: MetricsVariation[];
}

export default function MetricsChart({ data, variations }: MetricsChartProps) {
  const selectedVariationIds = useMetricsStore((s) => s.selectedVariationIds);

  const chartData = useMemo(() => {
    return data.map((bucket) => {
      const point: Record<string, string | number> = { label: bucket.label };

      for (const variation of variations) {
        if (!selectedVariationIds.has(variation.id)) {
          continue;
        }

        let total = 0;
        for (const envData of Object.values(bucket.byEnvironment)) {
          total += envData[variation.name] ?? 0;
        }
        point[variation.name] = total;
      }

      return point;
    });
  }, [data, variations, selectedVariationIds]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    variations.forEach((v, i) => {
      if (selectedVariationIds.has(v.id)) {
        config[v.name] = {
          label: v.name,
          color: VARIATION_COLORS[i % VARIATION_COLORS.length],
        };
      }
    });
    return config;
  }, [variations, selectedVariationIds]);

  const visibleVariations = variations.filter((v) =>
    selectedVariationIds.has(v.id)
  );

  if (chartData.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center text-ui-fg-muted">
        No data available for the selected time range
      </div>
    );
  }

  return (
    <ChartContainer className="h-full w-full" config={chartConfig}>
      <LineChart accessibilityLayer data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="label"
          tickFormatter={(value) => value}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          axisLine={false}
          tickFormatter={(value: number) => {
            if (value >= 1_000_000) {
              return `${(value / 1_000_000).toFixed(1)}M`;
            }
            if (value >= 1000) {
              return `${(value / 1000).toFixed(1)}K`;
            }
            return String(value);
          }}
          tickLine={false}
          tickMargin={8}
          width={40}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        {visibleVariations.map((variation, index) => (
          <Line
            dataKey={variation.name}
            dot={false}
            key={variation.id}
            stroke={VARIATION_COLORS[index % VARIATION_COLORS.length]}
            strokeWidth={2}
            type="monotone"
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
