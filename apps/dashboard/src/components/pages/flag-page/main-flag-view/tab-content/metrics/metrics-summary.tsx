import { getVariationColorByIndex } from "@gradual/api/utils";
import { Button } from "@gradual/ui/button";
import { Text } from "@gradual/ui/text";
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiExpandUpDownLine,
} from "@remixicon/react";
import { useState } from "react";
import { useMetricsStore } from "./metrics-store";
import type { MetricsVariation } from "./types";

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
        color: v.color ?? getVariationColorByIndex(index),
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
    <div className="flex flex-col">
      <div className="flex flex-wrap divide-x">
        <div className="flex-1">
          <div className="flex-1 bg-ui-bg-base p-3">
            <Text className="text-ui-fg-muted" size="small">
              Total Evaluations
            </Text>
            <Text className="mt-1" size="xlarge" weight="plus">
              {formatNumber(totalEvaluations)}
            </Text>
            <ChangeIndicator change={totalChange} />
          </div>
        </div>

        {visibleStats.map((stat) => {
          const change = calculateChange(stat.count, stat.previousCount);
          return (
            <div className="flex-1" key={stat.id}>
              <div className="flex-1 bg-ui-bg-base p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-[4px]"
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
            </div>
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
  const colorClass = isPositive
    ? "dark:text-green-400 text-green-600"
    : "dark:text-red-400 text-red-600";

  return (
    <div className={`mt-1 flex items-center gap-0.5 ${colorClass}`}>
      <Icon className="size-4" />
      <Text className={colorClass} size="xsmall">
        {Math.abs(change).toFixed(1)}% vs previous period
      </Text>
    </div>
  );
}
