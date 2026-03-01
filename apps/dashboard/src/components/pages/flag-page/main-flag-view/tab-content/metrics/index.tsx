import type { RouterOutputs } from "@gradual/api";
import { Card } from "@gradual/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type LiveEvaluation,
  useLiveEvaluationListener,
} from "@/hooks/use-live-evaluations";
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
  const timeframePreset = useMetricsStore((s) => s.timeframePreset);
  const initialize = useMetricsStore((s) => s.initialize);
  const initializedFlagId = useRef<string | null>(null);

  const { data, dataUpdatedAt } = useSuspenseQuery({
    ...trpc.featureFlags.getMetricsEvaluations.queryOptions({
      flagId: flag.id,
      organizationSlug,
      projectSlug,
      environmentIds: environmentId ? [environmentId] : [],
      startDate: dateRange.from,
      endDate: dateRange.to,
    }),
    refetchInterval: 30_000,
  });

  const [liveVariationCounts, setLiveVariationCounts] = useState<
    Map<string, number>
  >(() => new Map());

  const prevDataUpdatedAtRef = useRef(dataUpdatedAt);
  if (prevDataUpdatedAtRef.current !== dataUpdatedAt) {
    prevDataUpdatedAtRef.current = dataUpdatedAt;
    if (liveVariationCounts.size > 0) {
      setLiveVariationCounts(new Map());
    }
  }

  const isLive =
    timeframePreset !== "custom" ||
    dateRange.to.getTime() >= Date.now() - 60 * 60 * 1000;

  useLiveEvaluationListener(
    useCallback(
      (event: LiveEvaluation) => {
        if (!isLive) {
          return;
        }
        if (event.featureFlagId !== flag.id) {
          return;
        }
        if (environmentId && event.environmentId !== environmentId) {
          return;
        }
        const { variationId } = event;
        if (!variationId) {
          return;
        }
        setLiveVariationCounts((prev) => {
          const next = new Map(prev);
          next.set(variationId, (next.get(variationId) ?? 0) + 1);
          return next;
        });
      },
      [flag.id, environmentId, isLive]
    )
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
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <MetricsHeader variations={data.variations} />
      <MetricsSummary
        liveVariationCounts={liveVariationCounts}
        previousTotals={data.previousTotals}
        totals={data.totals}
        variations={data.variations}
      />
      <div className="min-h-0 flex-1 border-t pt-2">
        <MetricsChart
          data={data.data}
          liveVariationCounts={liveVariationCounts}
          variations={data.variations}
        />
      </div>
    </div>
  );
}
