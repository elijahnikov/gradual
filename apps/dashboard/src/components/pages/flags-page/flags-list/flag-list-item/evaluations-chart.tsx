import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@gradual/ui/chart";
import { Skeleton } from "@gradual/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { useTRPC } from "@/lib/trpc";

const VARIATION_COLORS = [
  "#32AA40", // Green
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
];

interface EvaluationsChartProps {
  flagId: string;
  organizationId: string;
  projectId: string;
}

export default function EvaluationsPreviewChart({
  flagId,
  organizationId,
  projectId,
}: EvaluationsChartProps) {
  const trpc = useTRPC();
  const { data: evaluations, isLoading } = useQuery(
    trpc.featureFlags.getPreviewEvaluations.queryOptions({
      flagId,
      organizationId,
      projectId,
    })
  );

  const { developmentData, productionData, chartConfig } = useMemo(() => {
    if (!evaluations) {
      return { developmentData: [], productionData: [], chartConfig: {} };
    }

    const devData = evaluations.data.map((d) => ({
      time: d.time,
      ...d.byEnvironment.Development,
    }));

    const prodData = evaluations.data.map((d) => ({
      time: d.time,
      ...d.byEnvironment.Production,
    }));

    const config: ChartConfig = {};
    evaluations.variations.forEach((v, i) => {
      config[v.name] = {
        label: v.name,
        color: VARIATION_COLORS[i % VARIATION_COLORS.length],
      };
    });

    return {
      developmentData: devData,
      productionData: prodData,
      chartConfig: config,
    };
  }, [evaluations]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
      </div>
    );
  }

  if (!evaluations) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <ChartContainer className="h-10 w-36" config={chartConfig}>
        <AreaChart accessibilityLayer data={developmentData}>
          <XAxis dataKey="time" hide />
          <YAxis domain={[0, "auto"]} hide />
          <ChartTooltip
            animationDuration={0}
            content={<ChartTooltipContent className="z-100!" />}
            isAnimationActive={false}
            position={{ y: 40 }}
          />
          {evaluations.variations.map((v) => (
            <defs key={v.id}>
              <linearGradient id={`fill-${v.name}`} x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={`var(--color-${v.name})`}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={`var(--color-${v.name})`}
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
          ))}

          {evaluations.variations.map((v) => (
            <Area
              activeDot={false}
              dataKey={v.name}
              fill={`url(#fill-${v.name})`}
              fillOpacity={0.4}
              isAnimationActive={false}
              key={v.id}
              stackId="a"
              stroke={`var(--color-${v.name})`}
              strokeWidth={1.25}
              type="linear"
            />
          ))}
        </AreaChart>
      </ChartContainer>
      <ChartContainer className="h-10 w-36" config={chartConfig}>
        <AreaChart accessibilityLayer data={productionData}>
          <XAxis dataKey="time" hide />
          <YAxis domain={[0, "auto"]} hide />
          <ChartTooltip
            animationDuration={0}
            content={<ChartTooltipContent />}
            isAnimationActive={false}
            position={{ y: 40 }}
          />

          {evaluations.variations.map((v) => (
            <defs key={v.id}>
              <linearGradient id={`fill-${v.name}`} x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={`var(--color-${v.name})`}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={`var(--color-${v.name})`}
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
          ))}

          {evaluations.variations.map((v) => (
            <Area
              activeDot={false}
              dataKey={v.name}
              fill={`url(#fill-${v.name})`}
              fillOpacity={0.4}
              isAnimationActive={false}
              key={v.id}
              stackId="a"
              stroke={`var(--color-${v.name})`}
              strokeWidth={1.25}
              type="linear"
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
