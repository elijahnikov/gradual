import type { RouterOutputs } from "@gradual/api";
import { Card } from "@gradual/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useTRPC } from "@/lib/trpc";
import MetricsChart from "./metrics-chart";
import MetricsHeader from "./metrics-header";
import { MetricsStoreProvider, useMetricsStore } from "./metrics-store";
import MetricsSummary from "./metrics-summary";

type Flag = RouterOutputs["featureFlags"]["getByKey"]["flag"];

interface FlagMetricsProps {
  flag: Flag;
  organizationSlug: string;
  projectSlug: string;
  environmentId?: string;
}

export default function FlagMetrics({
  flag,
  organizationSlug,
  projectSlug,
  environmentId,
}: FlagMetricsProps) {
  return (
    <MetricsStoreProvider>
      <MetricsContent
        environmentId={environmentId}
        flag={flag}
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
      />
    </MetricsStoreProvider>
  );
}

function MetricsContent({
  flag,
  organizationSlug,
  projectSlug,
  environmentId,
}: FlagMetricsProps) {
  const trpc = useTRPC();

  const dateRange = useMetricsStore((s) => s.dateRange);
  const initialize = useMetricsStore((s) => s.initialize);
  const initializedFlagId = useRef<string | null>(null);

  const { data } = useSuspenseQuery(
    trpc.featureFlags.getMetricsEvaluations.queryOptions({
      flagId: flag.id,
      organizationSlug,
      projectSlug,
      environmentIds: environmentId ? [environmentId] : [],
      startDate: dateRange.from,
      endDate: dateRange.to,
    })
  );

  useEffect(() => {
    if (data?.variations && initializedFlagId.current !== flag.id) {
      initializedFlagId.current = flag.id;
      initialize({
        flagId: flag.id,
        organizationSlug,
        projectSlug,
        variationIds: data.variations.map((v) => v.id),
      });
    }
  }, [flag.id, organizationSlug, projectSlug, initialize, data?.variations]);

  if (!environmentId) {
    return (
      <div className="flex w-full flex-1 flex-col p-2">
        <Card className="flex h-full w-full flex-1 flex-col items-center justify-center p-8">
          <p className="text-ui-fg-muted">
            Select an environment to view metrics
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <MetricsHeader variations={data.variations} />
      <MetricsSummary
        previousTotals={data.previousTotals}
        totals={data.totals}
        variations={data.variations}
      />
      <div className="h-full min-h-[400px] border-t">
        <div className="h-full bg-ui-bg-base py-2 pt-4 pr-4 pb-2">
          <MetricsChart data={data.data} variations={data.variations} />
        </div>
      </div>
    </div>
  );
}
