import { useParams } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Flag,
  Monitor,
  Timer,
} from "lucide-react";
import AnalyticsHeader from "./analytics-header";
import { AnalyticsStoreProvider } from "./analytics-store";
import ErrorRateWidget from "./widgets/error-rate-widget";
import LatencyWidget from "./widgets/latency-widget";
import SdkPlatformWidget from "./widgets/sdk-platform-widget";
import TopFlagsWidget from "./widgets/top-flags-widget";
import TotalEvaluationsWidget from "./widgets/total-evaluations-widget";
import VolumeOverTimeWidget from "./widgets/volume-over-time-widget";
import WidgetWrapper from "./widgets/widget-wrapper";

function AnalyticsContent() {
  return (
    <div className="flex h-[calc(100vh-3.4rem)] min-h-[calc(100vh-3.4rem)] w-full flex-col">
      <AnalyticsHeader />
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid divide-x divide-x-border sm:grid-cols-2">
          <WidgetWrapper
            description="All flag evaluations in the selected period"
            icon={Activity}
            title="Total Evaluations"
            variant="kpi"
          >
            <TotalEvaluationsWidget />
          </WidgetWrapper>
          <WidgetWrapper
            description="Evaluations with errors"
            icon={AlertTriangle}
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
            icon={BarChart3}
            title="Evaluation Volume"
            variant="chart"
          >
            <VolumeOverTimeWidget />
          </WidgetWrapper>
        </div>

        <div className="grid divide-x divide-x-border border-t sm:grid-cols-2 lg:grid-cols-3">
          <WidgetWrapper
            description="p50 / p95 / p99 evaluation latency"
            icon={Timer}
            title="Evaluation Latency"
            variant="chart"
          >
            <LatencyWidget />
          </WidgetWrapper>
          <WidgetWrapper
            description="Evaluations by SDK platform"
            icon={Monitor}
            title="SDK Platforms"
            variant="bar"
          >
            <SdkPlatformWidget />
          </WidgetWrapper>
          <WidgetWrapper
            className="min-h-[300px] p-0"
            description="Most evaluated flags"
            icon={Flag}
            title="Top Flags"
            variant="table"
          >
            <TopFlagsWidget />
          </WidgetWrapper>
        </div>
      </div>
    </div>
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
