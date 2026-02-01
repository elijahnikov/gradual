import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { Text } from "@gradual/ui/text";
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiExpandUpDownLine,
} from "@remixicon/react";
import { useState } from "react";
import { useMetricsStore } from "./metrics-store";
import type { MetricsVariation } from "./types";

const VARIATION_COLORS = [
  "#32AA40", // Green
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
];

const MAX_VISIBLE_CARDS = 3; // Total + 3 variations = 4 cards in one row

interface MetricsSummaryProps {
  totals: Record<string, number>;
  previousTotals: Record<string, number>;
  variations: MetricsVariation[];
}

export default function MetricsSummary({
  totals,
  previousTotals,
  variations,
}: MetricsSummaryProps) {
  const selectedVariationIds = useMetricsStore((s) => s.selectedVariationIds);
  const [isExpanded, setIsExpanded] = useState(false);

  const totalEvaluations = variations
    .filter((v) => selectedVariationIds.has(v.id))
    .reduce((sum, v) => sum + (totals[v.id] ?? 0), 0);

  const previousTotalEvaluations = variations
    .filter((v) => selectedVariationIds.has(v.id))
    .reduce((sum, v) => sum + (previousTotals[v.id] ?? 0), 0);

  const variationStats = variations
    .filter((v) => selectedVariationIds.has(v.id))
    .map((v, index) => {
      const count = totals[v.id] ?? 0;
      const previousCount = previousTotals[v.id] ?? 0;
      const percentage =
        totalEvaluations > 0 ? (count / totalEvaluations) * 100 : 0;
      return {
        ...v,
        count,
        previousCount,
        percentage,
        color: VARIATION_COLORS[index % VARIATION_COLORS.length],
      };
    });

  const hasMoreCards = variationStats.length > MAX_VISIBLE_CARDS;
  const visibleStats = isExpanded
    ? variationStats
    : variationStats.slice(0, MAX_VISIBLE_CARDS);
  const hiddenCount = variationStats.length - MAX_VISIBLE_CARDS;

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  };

  const totalChange = calculateChange(
    totalEvaluations,
    previousTotalEvaluations
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-1">
          <div className="rounded-sm border bg-ui-bg-base p-3">
            <Text className="text-ui-fg-muted" size="small">
              Total Evaluations
            </Text>
            <Text className="mt-1" size="xlarge" weight="plus">
              {formatNumber(totalEvaluations)}
            </Text>
            <ChangeIndicator change={totalChange} />
          </div>
        </Card>

        {visibleStats.map((stat) => {
          const change = calculateChange(stat.count, stat.previousCount);
          return (
            <Card className="p-1" key={stat.id}>
              <div className="rounded-sm border bg-ui-bg-base p-3">
                <div className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: stat.color }}
                  />
                  <Text className="text-ui-fg-muted" size="small">
                    {stat.name}
                  </Text>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <Text size="xlarge" weight="plus">
                    {formatNumber(stat.count)}
                  </Text>
                  <Text className="text-ui-fg-muted" size="small">
                    ({stat.percentage.toFixed(1)}%)
                  </Text>
                </div>
                <ChangeIndicator change={change} />
              </div>
            </Card>
          );
        })}
      </div>

      {hasMoreCards && (
        <Button
          className="self-start"
          onClick={() => setIsExpanded(!isExpanded)}
          size="small"
          variant="ghost"
        >
          <RiExpandUpDownLine className="size-4" />
          <Text size="small">
            {isExpanded ? "Show less" : `Show ${hiddenCount} more`}
          </Text>
        </Button>
      )}
    </div>
  );
}

function ChangeIndicator({ change }: { change: number }) {
  if (change === 0) {
    return (
      <Text className="mt-1 text-ui-fg-muted" size="xsmall">
        No change vs previous period
      </Text>
    );
  }

  const isPositive = change > 0;
  const Icon = isPositive ? RiArrowUpSLine : RiArrowDownSLine;
  const colorClass = isPositive ? "text-green-600" : "text-red-600";

  return (
    <div className={`mt-1 flex items-center gap-0.5 ${colorClass}`}>
      <Icon className="size-4" />
      <Text className={colorClass} size="xsmall">
        {Math.abs(change).toFixed(1)}% vs previous period
      </Text>
    </div>
  );
}
