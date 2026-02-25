import { Card } from "@gradual/ui/card";
import { Text } from "@gradual/ui/text";
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiFlagLine,
  RiFlashlightLine,
  RiGlobalLine,
} from "@remixicon/react";

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return String(value);
}

function KpiCard({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  subtitle: string;
  trend?: { value: number; direction: "up" | "down" | "neutral" };
}) {
  return (
    <div className="flex flex-col gap-1 p-3">
      <Card>
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 text-ui-fg-muted" />
          <Text className="text-ui-fg-muted" size="xsmall">
            {title}
          </Text>
        </div>
        <span className="font-semibold text-2xl tracking-tight">{value}</span>
        <div className="flex items-center gap-1.5">
          {trend && trend.direction !== "neutral" && (
            <span
              className={`flex items-center text-xs ${
                trend.direction === "up" ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend.direction === "up" ? (
                <RiArrowUpLine className="size-3" />
              ) : (
                <RiArrowDownLine className="size-3" />
              )}
              {trend.value.toFixed(1)}%
            </span>
          )}
          <Text className="text-ui-fg-muted" size="xsmall">
            {subtitle}
          </Text>
        </div>
      </Card>
    </div>
  );
}

interface HomeSummaryData {
  totalFlags: number;
  activeFlags: number;
  totalEnvironments: number;
  evaluations24h: { current: number; previous: number };
}

export default function HomeKpiCards({ data }: { data: HomeSummaryData }) {
  const evalTrend = (() => {
    const { current, previous } = data.evaluations24h;
    if (previous === 0) {
      return {
        value: current > 0 ? 100 : 0,
        direction: (current > 0 ? "up" : "neutral") as
          | "up"
          | "down"
          | "neutral",
      };
    }
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      direction: (change > 0 ? "up" : change < 0 ? "down" : "neutral") as
        | "up"
        | "down"
        | "neutral",
    };
  })();

  return (
    <div className="grid divide-x sm:grid-cols-3">
      <KpiCard
        icon={RiFlagLine}
        subtitle={`${data.activeFlags} active`}
        title="Flags"
        value={String(data.totalFlags)}
      />
      <KpiCard
        icon={RiGlobalLine}
        subtitle="configured"
        title="Environments"
        value={String(data.totalEnvironments)}
      />
      <KpiCard
        icon={RiFlashlightLine}
        subtitle="vs previous 24h"
        title="Evaluations (24h)"
        trend={evalTrend}
        value={formatNumber(data.evaluations24h.current)}
      />
    </div>
  );
}
