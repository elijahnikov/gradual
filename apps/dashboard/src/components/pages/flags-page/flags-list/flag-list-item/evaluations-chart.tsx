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

// Sanitize name for use as CSS variable name
const sanitizeCssVarName = (name: string) =>
  name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

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

  const { developmentData, productionData, chartConfig, variationsWithCssKey } =
    useMemo(() => {
      if (!evaluations) {
        return {
          developmentData: [],
          productionData: [],
          chartConfig: {},
          variationsWithCssKey: [],
        };
      }

      const devData = evaluations.data.map((d) => ({
        time: d.time,
        ...d.byEnvironment.Development,
      }));

      const prodData = evaluations.data.map((d) => ({
        time: d.time,
        ...d.byEnvironment.Production,
      }));

      // Create variations with sanitized CSS keys
      const variations = evaluations.variations.map((v, i) => ({
        ...v,
        cssKey: sanitizeCssVarName(v.name),
        color: VARIATION_COLORS[i % VARIATION_COLORS.length],
      }));

      const config: ChartConfig = {};
      for (const v of variations) {
        config[v.name] = {
          label: v.name,
          color: v.color,
        };
      }

      return {
        developmentData: devData,
        productionData: prodData,
        chartConfig: config,
        variationsWithCssKey: variations,
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
        <AreaChart
          accessibilityLayer
          className="relative"
          data={developmentData}
        >
          <XAxis dataKey="time" hide />
          <YAxis domain={[0, "auto"]} hide />
          <ChartTooltip
            animationDuration={0}
            content={<ChartTooltipContent className="absolute top-10" />}
            isAnimationActive={false}
            position={{ y: 40 }}
          />
          {variationsWithCssKey.map((v) => (
            <defs key={`dev-def-${v.id}`}>
              <linearGradient
                id={`fill-dev-${v.cssKey}`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="5%" stopColor={v.color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={v.color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
          ))}

          {variationsWithCssKey.map((v) => (
            <Area
              activeDot={false}
              dataKey={v.name}
              fill={`url(#fill-dev-${v.cssKey})`}
              fillOpacity={0.4}
              isAnimationActive={false}
              key={v.id}
              stackId="a"
              stroke={v.color}
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
            content={<ChartTooltipContent className="absolute top-10" />}
            isAnimationActive={false}
            position={{ y: 40 }}
          />
          {variationsWithCssKey.map((v) => (
            <defs key={`prod-def-${v.id}`}>
              <linearGradient
                id={`fill-prod-${v.cssKey}`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="5%" stopColor={v.color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={v.color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
          ))}

          {variationsWithCssKey.map((v) => (
            <Area
              activeDot={false}
              dataKey={v.name}
              fill={`url(#fill-prod-${v.cssKey})`}
              fillOpacity={0.4}
              isAnimationActive={false}
              key={v.id}
              stackId="a"
              stroke={v.color}
              strokeWidth={1.25}
              type="linear"
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
