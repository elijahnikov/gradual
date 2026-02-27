import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@gradual/ui/chart";
import { useTheme } from "@gradual/ui/theme";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Liveline, type LivelineSeries } from "liveline";
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

function computePercentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

const chartConfig: ChartConfig = {
  p50: { label: "p50", color: "var(--chart-1)" },
  p95: { label: "p95", color: "var(--chart-2)" },
  p99: { label: "p99", color: "var(--chart-3)" },
};

const SERIES_COLORS = {
  p50: "#3b82f6",
  p95: "#f59e0b",
  p99: "#ef4444",
};

export default function LatencyWidget() {
  const { resolvedTheme } = useTheme();
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

  const live = useAnalyticsLive();

  const livelineSeries = useMemo((): LivelineSeries[] | null => {
    if (!live.isLive) {
      return null;
    }

    const p50Data = data.data.map((d) => ({
      time: new Date(d.time).getTime() / 1000,
      value: d.p50 ?? 0,
    }));
    const p95Data = data.data.map((d) => ({
      time: new Date(d.time).getTime() / 1000,
      value: d.p95 ?? 0,
    }));
    const p99Data = data.data.map((d) => ({
      time: new Date(d.time).getTime() / 1000,
      value: d.p99 ?? 0,
    }));

    if (live.latencyValues.length > 0) {
      const sorted = [...live.latencyValues].sort((a, b) => a - b);
      const now = Date.now() / 1000;
      p50Data.push({ time: now, value: computePercentile(sorted, 50) });
      p95Data.push({ time: now, value: computePercentile(sorted, 95) });
      p99Data.push({ time: now, value: computePercentile(sorted, 99) });
    }

    const lastP50 = p50Data.at(-1)?.value ?? 0;
    const lastP95 = p95Data.at(-1)?.value ?? 0;
    const lastP99 = p99Data.at(-1)?.value ?? 0;

    return [
      {
        id: "p50",
        data: p50Data,
        value: lastP50,
        color: SERIES_COLORS.p50,
        label: "p50",
      },
      {
        id: "p95",
        data: p95Data,
        value: lastP95,
        color: SERIES_COLORS.p95,
        label: "p95",
      },
      {
        id: "p99",
        data: p99Data,
        value: lastP99,
        color: SERIES_COLORS.p99,
        label: "p99",
      },
    ];
  }, [data.data, live.isLive, live.latencyValues]);

  const windowSecs = useMemo(() => {
    if (!livelineSeries) {
      return 60;
    }
    const allTimes = livelineSeries.flatMap((s) => s.data.map((d) => d.time));
    const min = Math.min(...allTimes);
    const max = Math.max(...allTimes);
    if (max <= min) {
      return 60;
    }
    return Math.max(60, Math.ceil((max - min) * 1.1));
  }, [livelineSeries]);

  const chartData = useMemo(() => {
    const points = data.data.map((point) => ({
      label: formatTimeLabel(point.time, data.granularity),
      p50: point.p50 ?? 0,
      p95: point.p95 ?? 0,
      p99: point.p99 ?? 0,
    }));

    if (live.isLive && live.latencyValues.length > 0) {
      const sorted = [...live.latencyValues].sort((a, b) => a - b);
      points.push({
        label: "Now",
        p50: computePercentile(sorted, 50),
        p95: computePercentile(sorted, 95),
        p99: computePercentile(sorted, 99),
      });
    }

    return points;
  }, [data.data, data.granularity, live.isLive, live.latencyValues]);

  if (livelineSeries) {
    const primary = livelineSeries[0];
    const hasData = primary && livelineSeries.some((s) => s.data.length >= 2);

    if (!(hasData && primary)) {
      return (
        <div className="flex h-full items-center justify-center text-ui-fg-muted">
          No latency data available
        </div>
      );
    }

    return (
      <Liveline
        badge={false}
        data={primary.data}
        formatTime={formatLivelineTime}
        formatValue={(v) => formatDuration(Math.round(v))}
        grid
        momentum={false}
        scrub
        series={livelineSeries}
        theme={resolvedTheme}
        value={primary.value}
        window={windowSecs}
      />
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-ui-fg-muted">
        No latency data available
      </div>
    );
  }

  return (
    <ChartContainer className="h-full w-full" config={chartConfig}>
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
          type="linear"
        />
        <Area
          connectNulls
          dataKey="p95"
          dot={false}
          fill="url(#gradP95)"
          isAnimationActive={false}
          stroke="var(--chart-2)"
          strokeWidth={1.5}
          type="linear"
        />
        <Area
          connectNulls
          dataKey="p50"
          dot={false}
          fill="url(#gradP50)"
          isAnimationActive={false}
          stroke="var(--chart-1)"
          strokeWidth={1.5}
          type="linear"
        />
      </AreaChart>
    </ChartContainer>
  );
}
