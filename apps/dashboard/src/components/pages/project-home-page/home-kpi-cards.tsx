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
  description?: string;
  value: string;
  subtitle: string;
  trend?: { value: number; direction: "up" | "down" | "neutral" };
}) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-1.5 border-b bg-ui-bg-subtle px-4 py-3">
        <div className="flex items-center gap-x-1">
          {Icon && <Icon className="size-4 shrink-0 text-ui-fg-muted" />}
          <Text size="small" weight="plus">
            {title}
          </Text>
        </div>
      </div>
      <div className="flex flex-col justify-center px-4 py-3">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-3xl tracking-tight">{value}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {trend && trend.direction !== "neutral" && (
            <span
              className={`flex items-center text-sm ${
                trend.direction === "up" ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend.direction === "up" ? (
                <RiArrowUpLine className="size-3.5" />
              ) : (
                <RiArrowDownLine className="size-3.5" />
              )}
              {trend.value.toFixed(1)}%
            </span>
          )}
          <Text className="text-ui-fg-muted" size="xsmall">
            {subtitle}
          </Text>
        </div>
      </div>
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
    <div className="grid divide-x divide-x-border sm:grid-cols-3">
      <KpiCard
        description={`${data.activeFlags} active`}
        icon={RiFlagLine}
        subtitle={`${data.totalFlags} total flags`}
        title="Flags"
        value={String(data.totalFlags)}
      />
      <KpiCard
        description="Configured"
        icon={RiGlobalLine}
        subtitle="configured"
        title="Environments"
        value={String(data.totalEnvironments)}
      />
      <KpiCard
        description="Last 24 hours"
        icon={RiFlashlightLine}
        subtitle="vs previous 24h"
        title="Evaluations"
        trend={evalTrend}
        value={formatNumber(data.evaluations24h.current)}
      />
    </div>
  );
}
