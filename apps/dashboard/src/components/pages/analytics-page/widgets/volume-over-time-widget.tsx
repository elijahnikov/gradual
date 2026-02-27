import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@gradual/ui/chart";
import { useTheme } from "@gradual/ui/theme";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Liveline } from "liveline";
import { useMemo } from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { useTRPC } from "@/lib/trpc";
import { useAnalyticsLive } from "../analytics-live-context";
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

const ONE_DAY_SECS = 86_400;

function formatLivelineTime(t: number): string {
  const date = new Date(t * 1000);
  const now = Date.now() / 1000;
  const ago = now - t;

  if (ago > ONE_DAY_SECS) {
    return date.toLocaleString(undefined, {
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function VolumeOverTimeWidget() {
  const { resolvedTheme } = useTheme();
  const trpc = useTRPC();
  const organizationSlug = useAnalyticsStore((s) => s.organizationSlug);
  const projectSlug = useAnalyticsStore((s) => s.projectSlug);
  const dateRange = useAnalyticsStore((s) => s.dateRange);
  const environmentIds = useAnalyticsStore((s) => s.selectedEnvironmentIds);
  const flagIds = useAnalyticsStore((s) => s.selectedFlagIds);

  const live = useAnalyticsLive();

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

  const livelineData = useMemo(() => {
    const points: { time: number; value: number }[] = data.data.map((d) => ({
      time: new Date(d.time).getTime() / 1000,
      value: d.count,
    }));

    for (const p of live.volumePoints) {
      points.push(p);
    }

    return points;
  }, [data.data, live.volumePoints]);

  const currentValue = useMemo(
    () => livelineData.at(-1)?.value ?? 0,
    [livelineData]
  );

  const windowSecs = useMemo(() => {
    const first = livelineData[0];
    const last = livelineData.at(-1);
    if (!(first && last)) {
      return 60;
    }
    const span = last.time - first.time;
    return Math.max(60, Math.ceil(span * 1.1));
  }, [livelineData]);

  if (live.isLive) {
    if (livelineData.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-ui-fg-muted">
          No data available for the selected time range
        </div>
      );
    }

    return (
      <Liveline
        badge={false}
        color="#3b82f6"
        data={livelineData}
        formatTime={formatLivelineTime}
        formatValue={(v) => formatYAxis(Math.round(v))}
        grid
        momentum={false}
        scrub
        theme={resolvedTheme}
        value={currentValue}
        window={windowSecs}
      />
    );
  }

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
    <ChartContainer className="h-full w-full" config={chartConfig}>
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
          type="linear"
        />
      </AreaChart>
    </ChartContainer>
  );
}
