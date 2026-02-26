import { Card } from "@gradual/ui/card";
import { Skeleton } from "@gradual/ui/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { Suspense, useMemo } from "react";
import { useTRPC } from "@/lib/trpc";
import { type FlagTab, flagSearchParams } from "./flag-search-params";
import FlagSidebar from "./flag-sidebar";
import FlagSubheader from "./flag-subheader";
import FlagEvents from "./tab-content/events";
import FlagMetrics from "./tab-content/metrics";
import FlagSettings from "./tab-content/settings";
import FlagTargeting from "./tab-content/targeting";
import FlagVariations from "./tab-content/variations";

interface MainFlagViewProps {
  organizationSlug: string;
  projectSlug: string;
  flagSlug: string;
}
export default function MainFlagView({
  organizationSlug,
  projectSlug,
  flagSlug,
}: MainFlagViewProps) {
  const trpc = useTRPC();
  const [{ tab, environment }] = useQueryStates(flagSearchParams);

  const { data: flag } = useSuspenseQuery(
    trpc.featureFlags.getByKey.queryOptions({
      projectSlug,
      organizationSlug,
      key: flagSlug,
    })
  );

  const renderTabContent = useMemo(() => {
    switch (tab) {
      case "targeting":
        return environment ? (
          <FlagTargeting
            environmentSlug={environment}
            flag={flag}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
          />
        ) : null;
      case "variations":
        return (
          <FlagVariations
            flag={flag}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
          />
        );
      case "metrics": {
        const selectedEnv = flag.environments.find(
          (e) => e.environment.slug === environment
        );
        return (
          <FlagMetrics
            environmentId={selectedEnv?.environment.id}
            flag={flag.flag}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
          />
        );
      }
      case "events": {
        const selectedEnvForEvents = flag.environments.find(
          (e) => e.environment.slug === environment
        );
        return (
          <FlagEvents
            environmentId={selectedEnvForEvents?.environment.id}
            flag={flag.flag}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            variations={flag.variations}
          />
        );
      }
      case "settings":
        return (
          <FlagSettings
            flag={flag}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
          />
        );
      default:
        return null;
    }
  }, [tab, flag, environment, organizationSlug, projectSlug]);

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col overflow-y-auto">
        <FlagSubheader environments={flag.environments} />
        <Suspense fallback={<TabContentSkeleton tab={tab} />}>
          <div className="flex min-h-[calc(100vh-6.75rem)] w-full flex-1 flex-col">
            {renderTabContent}
          </div>
        </Suspense>
      </div>
      <FlagSidebar
        flag={flag.flag}
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
      />
    </div>
  );
}

function TabContentSkeleton({ tab }: { tab: FlagTab }) {
  switch (tab) {
    case "targeting":
      return <TargetingTabSkeleton />;
    case "variations":
      return <VariationsTabSkeleton />;
    case "metrics":
      return <MetricsTabSkeleton />;
    case "events":
      return <EventsTabSkeleton />;
    default:
      return <GenericTabSkeleton />;
  }
}

function TargetingTabSkeleton() {
  return (
    <div className="flex w-full flex-1 flex-col pt-2.5">
      <div className="mb-3 flex flex-col gap-2 px-2.5 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-5 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-6 rounded-md" />
          <Skeleton className="h-7 w-28 rounded-md" />
        </div>
      </div>
      <div className="flex h-full w-full flex-1 flex-col border-t bg-ui-bg-base">
        <div className="relative flex h-full min-h-[calc(100vh-15rem)] w-full flex-col items-center justify-start overflow-hidden bg-white dark:bg-ui-bg-base">
          <div className="flex w-full flex-col items-center gap-3 px-2 py-3 sm:px-0 sm:py-5">
            <TargetCardSkeleton />
            <TargetCardSkeleton />
            <Card className="flex w-full max-w-2xl flex-col gap-3 p-0">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-7 w-32 rounded-md" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function VariationsTabSkeleton() {
  return (
    <div className="flex w-full flex-1 flex-col pt-2.5">
      <div className="mb-3 flex justify-end px-2.5">
        <Skeleton className="h-7 w-32 rounded-md" />
      </div>
      <div className="flex flex-col divide-y border-t">
        <VariationCardSkeleton />
        <VariationCardSkeleton />
        <VariationCardSkeleton />
      </div>
    </div>
  );
}

function VariationCardSkeleton() {
  return (
    <div className="flex flex-col p-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-14 rounded-md" />
        </div>
      </div>
      <div className="mt-2">
        <Skeleton className="h-6 w-16 rounded-md" />
      </div>
      <div className="mt-2 flex items-center gap-0.5">
        <Skeleton className="size-4 rounded" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  );
}

function MetricsTabSkeleton() {
  return (
    <div className="flex w-full flex-1 flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b p-2.5">
        <Skeleton className="h-7 w-40 rounded-md" />
        <Skeleton className="h-7 w-36 rounded-md" />
      </div>
      {/* Summary cards */}
      <div className="flex flex-wrap divide-x">
        <div className="flex-1 bg-ui-bg-base p-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-2 h-7 w-16" />
          <Skeleton className="mt-1 h-3 w-36" />
        </div>
        <div className="flex-1 bg-ui-bg-base p-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="mt-2 h-7 w-20" />
          <Skeleton className="mt-1 h-3 w-28" />
        </div>
        <div className="flex-1 bg-ui-bg-base p-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="mt-2 h-7 w-20" />
          <Skeleton className="mt-1 h-3 w-28" />
        </div>
      </div>
      {/* Chart area */}
      <div className="h-full min-h-[400px] border-t">
        <div className="h-full bg-ui-bg-base px-4 py-2 pt-4 pb-2">
          <Skeleton className="h-full w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

function EventsTabSkeleton() {
  const columnWidths = ["w-20", "w-14", "w-16", "w-14", "w-16", "w-12"];
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      {/* Filter bar */}
      <div className="flex items-center gap-1.5 border-b bg-ui-bg-subtle px-2 py-1.5">
        <Skeleton className="h-6 w-20 rounded-md" />
        <Skeleton className="h-6 w-18 rounded-md" />
        <Skeleton className="h-6 w-18 rounded-md" />
        <Skeleton className="h-6 w-36 rounded-sm" />
      </div>
      {/* Table header */}
      <div className="flex border-b bg-ui-bg-subtle">
        {columnWidths.map((w, i) => (
          <div className="flex-1 px-3 py-2" key={i}>
            <Skeleton className={`h-3 ${w}`} />
          </div>
        ))}
      </div>
      {/* Table rows */}
      <div className="flex flex-1 flex-col">
        {Array.from({ length: 20 }).map((_, rowIdx) => (
          <div className="flex border-b" key={rowIdx}>
            {columnWidths.map((w, colIdx) => (
              <div className="flex-1 px-3 py-2.5" key={colIdx}>
                <Skeleton className={`h-3.5 ${w}`} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function GenericTabSkeleton() {
  return (
    <div className="flex w-full flex-1 flex-col px-5 py-3">
      <Card className="flex h-full w-full flex-1 flex-col p-4">
        <Skeleton className="h-6 w-48" />
        <div className="mt-4 flex flex-col gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Card>
    </div>
  );
}

function TargetCardSkeleton() {
  return (
    <Card className="flex w-full max-w-2xl flex-col p-0">
      <div className="flex flex-col gap-2.5 p-2.5 sm:p-3">
        {/* Name input */}
        <Skeleton className="h-7 w-full rounded-md" />
        {/* Condition row */}
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-7 w-32 rounded-md" />
          <Skeleton className="h-7 w-24 rounded-md" />
          <Skeleton className="h-7 w-40 rounded-md" />
        </div>
      </div>
      {/* Footer */}
      <div className="flex w-full items-center border-t px-2.5 py-2.5 sm:px-3">
        <div className="flex w-full items-center justify-end gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-7 w-32 rounded-md" />
        </div>
      </div>
    </Card>
  );
}
