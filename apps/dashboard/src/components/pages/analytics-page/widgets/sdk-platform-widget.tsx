import { Text } from "@gradual/ui/text";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTRPC } from "@/lib/trpc";
import { useAnalyticsStore } from "../analytics-store";

const PLATFORM_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function SdkPlatformWidget() {
  const trpc = useTRPC();
  const organizationSlug = useAnalyticsStore((s) => s.organizationSlug);
  const projectSlug = useAnalyticsStore((s) => s.projectSlug);
  const dateRange = useAnalyticsStore((s) => s.dateRange);
  const environmentIds = useAnalyticsStore((s) => s.selectedEnvironmentIds);
  const flagIds = useAnalyticsStore((s) => s.selectedFlagIds);

  const { data } = useSuspenseQuery(
    trpc.analytics.getSdkPlatformBreakdown.queryOptions({
      organizationSlug,
      projectSlug,
      startDate: dateRange.from,
      endDate: dateRange.to,
      environmentIds: environmentIds.length > 0 ? environmentIds : undefined,
      flagIds: flagIds.length > 0 ? flagIds : undefined,
    })
  );

  const chartItems = useMemo(() => {
    const maxCount = data.data[0]?.count ?? 0;
    return data.data.map((item, i) => ({
      name: item.platform,
      count: item.count,
      pct: maxCount > 0 ? (item.count / maxCount) * 100 : 0,
      color: PLATFORM_COLORS[i % PLATFORM_COLORS.length],
    }));
  }, [data.data]);

  if (chartItems.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-ui-fg-muted">
        No SDK platform data available
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-center gap-3">
      {chartItems.map((item) => (
        <div className="flex flex-col gap-1" key={item.name}>
          <div className="flex items-baseline justify-between">
            <Text className="text-ui-fg-muted" size="xsmall">
              {item.name}
            </Text>
            <Text className="text-ui-fg-muted tabular-nums" size="xsmall">
              {item.count.toLocaleString()}
            </Text>
          </div>
          <div className="h-2 w-full rounded-full bg-ui-bg-subtle-hover">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(item.pct, 2)}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
