import { getVariationColorByIndex } from "@gradual/api/utils";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@gradual/ui/chart";
import { Separator } from "@gradual/ui/separator";
import { Skeleton } from "@gradual/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { useChartEnvironmentsStore } from "@/lib/stores/chart-environments-store";
import { useTRPC } from "@/lib/trpc";

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
  const { getSelectedEnvironments } = useChartEnvironmentsStore();
  const selectedEnvIds = getSelectedEnvironments(projectId);

  const { data: evaluations, isLoading } = useQuery(
    trpc.featureFlags.getPreviewEvaluations.queryOptions(
      {
        flagId,
        organizationId,
        projectId,
        environmentIds: selectedEnvIds,
      },
      {
        enabled: selectedEnvIds.length > 0,
      }
    )
  );

  const { chartDataByEnvironment, chartConfig, variationsWithCssKey } =
    useMemo(() => {
      if (!evaluations) {
        return {
          chartDataByEnvironment: [],
          chartConfig: {},
          variationsWithCssKey: [],
        };
      }

      const variations = evaluations.variations.map((v, i) => ({
        ...v,
        cssKey: sanitizeCssVarName(v.name),
        color: v.color ?? getVariationColorByIndex(i),
      }));

      const defaultValues: Record<string, number> = {};
      for (const v of variations) {
        defaultValues[v.name] = 0;
      }

      const dataByEnv = evaluations.environments.map((env) => ({
        env,
        data: evaluations.data.map((d) => ({
          time: d.time,
          ...defaultValues,
          ...d.byEnvironment[env.name],
        })),
      }));

      const config: ChartConfig = {};
      for (const v of variations) {
        config[v.name] = {
          label: v.name,
          color: v.color,
        };
      }

      return {
        chartDataByEnvironment: dataByEnv,
        chartConfig: config,
        variationsWithCssKey: variations,
      };
    }, [evaluations]);

  if (isLoading || selectedEnvIds.length === 0) {
    return (
      <div className="flex items-center justify-center gap-4">
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
      {chartDataByEnvironment.map(({ env, data }, index) => (
        <>
          <ChartContainer
            className="h-10 w-36"
            config={chartConfig}
            key={env.id}
          >
            <AreaChart accessibilityLayer data={data}>
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, (max: number) => Math.max(max, 1)]} hide />
              <ChartTooltip
                animationDuration={0}
                content={<ChartTooltipContent className="absolute top-10" />}
                isAnimationActive={false}
                position={{ y: 40 }}
              />
              {variationsWithCssKey.map((v) => (
                <defs key={`def-${env.id}-${v.id}`}>
                  <linearGradient
                    id={`fill-${env.id}-${v.cssKey}`}
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
                  fill={`url(#fill-${env.id}-${v.cssKey})`}
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
          {index < chartDataByEnvironment.length - 1 && (
            <Separator className="h-10" orientation="vertical" />
          )}
        </>
      ))}
    </div>
  );
}
