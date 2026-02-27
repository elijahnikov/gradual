import { getVariationColorByIndex } from "@gradual/api/utils";
import { useTheme } from "@gradual/ui/theme";
import type { LivelineSeries } from "liveline";
import { Liveline } from "liveline";
import { useMemo } from "react";
import { useMetricsStore } from "./metrics-store";
import type { MetricsBucket, MetricsVariation } from "./types";

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

function formatYAxis(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return String(Math.round(value));
}

interface MetricsChartProps {
  data: MetricsBucket[];
  variations: MetricsVariation[];
}

export default function MetricsChart({ data, variations }: MetricsChartProps) {
  const { resolvedTheme } = useTheme();
  const selectedVariationIds = useMetricsStore((s) => s.selectedVariationIds);

  const visibleVariations = variations.filter((v) =>
    selectedVariationIds.has(v.id)
  );

  const series = useMemo((): LivelineSeries[] => {
    return visibleVariations.map((variation) => {
      const originalIndex = variations.findIndex((v) => v.id === variation.id);
      const color = variation.color ?? getVariationColorByIndex(originalIndex);

      const points = data.map((bucket) => {
        let total = 0;
        for (const envData of Object.values(bucket.byEnvironment)) {
          total += envData[variation.name] ?? 0;
        }
        return {
          time: new Date(bucket.time).getTime() / 1000,
          value: total,
        };
      });

      const lastValue = points.at(-1)?.value ?? 0;

      return {
        id: variation.id,
        data: points,
        value: lastValue,
        color,
        label: variation.name,
      };
    });
  }, [data, variations, visibleVariations]);

  const windowSecs = useMemo(() => {
    const allTimes = series.flatMap((s) => s.data.map((d) => d.time));
    if (allTimes.length === 0) {
      return 60;
    }
    const min = Math.min(...allTimes);
    const max = Math.max(...allTimes);
    if (max <= min) {
      return 60;
    }
    return Math.max(60, Math.ceil((max - min) * 1.1));
  }, [series]);

  if (data.length === 0 || series.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center text-ui-fg-muted">
        No data available for the selected time range
      </div>
    );
  }

  const primary = series[0];
  const hasData = primary && series.some((s) => s.data.length >= 2);

  if (!(hasData && primary)) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center text-ui-fg-muted">
        Not enough data points to render chart
      </div>
    );
  }

  return (
    <Liveline
      badge={false}
      data={primary.data}
      formatTime={formatLivelineTime}
      formatValue={(v) => formatYAxis(Math.round(v))}
      grid
      momentum={false}
      scrub
      series={series}
      theme={resolvedTheme}
      value={primary.value}
      window={windowSecs}
    />
  );
}
