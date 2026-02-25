import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@gradual/ui/chart";
import { Area, AreaChart, XAxis } from "recharts";

const chartConfig: ChartConfig = {
  evaluations: {
    label: "Evaluations",
    color: "var(--chart-1)",
  },
};

export default function HomeVolumeChart({
  data,
}: {
  data: { time: string; count: number }[];
}) {
  const chartData = data.map((point) => {
    const date = new Date(point.time);
    return {
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      evaluations: point.count,
    };
  });

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-ui-fg-muted">
        No evaluation data in the last 7 days
      </div>
    );
  }

  return (
    <ChartContainer className="h-full w-full" config={chartConfig}>
      <AreaChart
        data={chartData}
        margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
      >
        <defs>
          <linearGradient id="homeVolGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
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
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="evaluations"
          fill="url(#homeVolGrad)"
          isAnimationActive={false}
          stroke="var(--chart-1)"
          strokeWidth={1.5}
          type="monotone"
        />
      </AreaChart>
    </ChartContainer>
  );
}
