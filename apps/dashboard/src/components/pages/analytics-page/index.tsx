import {
  RiBarChartBoxLine,
  RiComputerLine,
  RiErrorWarningLine,
  RiPulseLine,
  RiTimerLine,
} from "@remixicon/react";
import { useParams } from "@tanstack/react-router";
import AnalyticsHeader from "./analytics-header";
import { AnalyticsLiveProvider } from "./analytics-live-context";
import { AnalyticsStoreProvider } from "./analytics-store";
import ErrorRateWidget from "./widgets/error-rate-widget";
import LatencyWidget from "./widgets/latency-widget";
import SdkPlatformWidget from "./widgets/sdk-platform-widget";
import TotalEvaluationsWidget from "./widgets/total-evaluations-widget";
import VolumeOverTimeWidget from "./widgets/volume-over-time-widget";
import WidgetWrapper from "./widgets/widget-wrapper";

function AnalyticsContent() {
  return (
    <AnalyticsLiveProvider>
      <div className="flex h-[calc(100vh-3.4rem)] min-h-[calc(100vh-3.4rem)] w-full flex-col">
        <AnalyticsHeader />
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="grid divide-x divide-x-border sm:grid-cols-2">
            <WidgetWrapper
              description="All flag evaluations in the selected period"
              icon={RiPulseLine}
              title="Total Evaluations"
              variant="kpi"
            >
              <TotalEvaluationsWidget />
            </WidgetWrapper>
            <WidgetWrapper
              description="Evaluations with errors"
              icon={RiErrorWarningLine}
              title="Error Rate"
              variant="kpi"
            >
              <ErrorRateWidget />
            </WidgetWrapper>
          </div>

          <div className="border-t">
            <WidgetWrapper
              className="h-[450px] min-h-[450px]"
              description="Evaluations over time"
              icon={RiBarChartBoxLine}
              title="Evaluation Volume"
              variant="canvas"
            >
              <VolumeOverTimeWidget />
            </WidgetWrapper>
          </div>

          <div className="grid divide-x divide-x-border border-t sm:grid-cols-3">
            <WidgetWrapper
              className="h-[350px] sm:col-span-2"
              description="p50 / p95 / p99 evaluation latency"
              icon={RiTimerLine}
              title="Evaluation Latency"
              variant="canvas"
            >
              <LatencyWidget />
            </WidgetWrapper>
            <WidgetWrapper
              description="Evaluations by SDK platform"
              icon={RiComputerLine}
              title="SDK Platforms"
              variant="bar"
            >
              <SdkPlatformWidget />
            </WidgetWrapper>
          </div>
        </div>
      </div>
    </AnalyticsLiveProvider>
  );
}

export default function AnalyticsPageComponent() {
  const { organizationSlug, projectSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/analytics/",
  });

  return (
    <AnalyticsStoreProvider
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
    >
      <AnalyticsContent />
    </AnalyticsStoreProvider>
  );
}
