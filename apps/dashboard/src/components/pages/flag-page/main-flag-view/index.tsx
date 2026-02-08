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
          />
        );
      }
      case "settings":
        return <FlagSettings />;
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
    <div className="flex w-full flex-1 flex-col p-2 sm:p-2">
      <Card className="flex h-full w-full flex-1 flex-col p-0">
        {/* Header */}
        <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-5 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-md" />
            <Skeleton className="h-7 w-28 rounded-md" />
          </div>
        </div>
        {/* Content area */}
        <div className="flex h-full w-full flex-1 flex-col rounded-md border-t bg-ui-bg-base p-1 sm:p-2">
          <div className="flex h-full w-full flex-1 flex-col rounded-md border bg-ui-bg-base p-1 sm:p-2">
            <div className="flex min-h-[calc(100vh-14rem)] w-full flex-col items-center justify-start gap-3 px-2 py-4 sm:px-0">
              {/* Target card skeleton */}
              <TargetCardSkeleton />
              <TargetCardSkeleton />
              {/* Default variation skeleton */}
              <div className="flex w-full max-w-3xl items-center justify-between rounded-lg border bg-ui-bg-base p-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-7 w-32 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function VariationsTabSkeleton() {
  return (
    <div className="flex w-full flex-1 flex-col p-2 sm:p-2">
      <div className="flex flex-col gap-3">
        <VariationCardSkeleton />
        <VariationCardSkeleton />
        <VariationCardSkeleton />
        <VariationCardSkeleton />
        <VariationCardSkeleton />
        <VariationCardSkeleton />
      </div>
    </div>
  );
}

function VariationCardSkeleton() {
  return (
    <Card className="flex flex-col p-0">
      {/* Header & Value */}
      <div className="p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-14 rounded-md" />
          </div>
        </div>
        {/* Value */}
        <div className="mt-2">
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      </div>
      {/* Footer with evaluations */}
      <div className="flex items-center border-t px-2 pt-2 pb-2">
        <div className="flex items-center gap-1">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
    </Card>
  );
}

function MetricsTabSkeleton() {
  return (
    <div className="flex w-full flex-1 flex-col gap-3 p-2">
      {/* Header with date picker and variations filter */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32 rounded-md" />
        <Skeleton className="h-7 w-28 rounded-md" />
      </div>
      {/* Summary cards - single row */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-1">
          <div className="rounded-sm border bg-ui-bg-base p-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-7 w-16" />
            <Skeleton className="mt-1 h-3 w-32" />
          </div>
        </Card>
        <Card className="p-1">
          <div className="rounded-sm border bg-ui-bg-base p-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-2 h-7 w-20" />
            <Skeleton className="mt-1 h-3 w-28" />
          </div>
        </Card>
        <Card className="p-1">
          <div className="rounded-sm border bg-ui-bg-base p-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-2 h-7 w-20" />
            <Skeleton className="mt-1 h-3 w-28" />
          </div>
        </Card>
        <Card className="p-1">
          <div className="rounded-sm border bg-ui-bg-base p-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-2 h-7 w-20" />
            <Skeleton className="mt-1 h-3 w-28" />
          </div>
        </Card>
      </div>
      {/* Chart card - larger */}
      <Card className="min-h-[400px] flex-1 p-1">
        <div className="h-full rounded-sm border bg-ui-bg-base p-2">
          <Skeleton className="h-full w-full rounded-md" />
        </div>
      </Card>
    </div>
  );
}

function EventsTabSkeleton() {
  const columnWidths = [
    "w-20",
    "w-14",
    "w-16",
    "w-14",
    "w-16",
    "w-16",
    "w-12",
    "w-24",
  ];
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex border-b bg-ui-bg-subtle">
        {columnWidths.map((w, i) => (
          <div className="flex-1 px-3 py-2" key={i}>
            <Skeleton className={`h-3 ${w}`} />
          </div>
        ))}
      </div>
      {/* Rows — fills remaining space */}
      <div className="flex flex-1 flex-col">
        {Array.from({ length: 30 }).map((_, rowIdx) => (
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
    <div className="flex w-full flex-1 flex-col p-3">
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
    <Card className="flex w-full max-w-3xl flex-col p-0">
      <div className="flex flex-col gap-3 p-3 sm:p-4">
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
      <div className="flex w-full items-center border-t px-3 py-3 sm:px-4">
        <div className="flex w-full items-center justify-between gap-2">
          <Skeleton className="size-6 rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-7 w-32 rounded-md" />
          </div>
        </div>
      </div>
    </Card>
  );
}
