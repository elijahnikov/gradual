import { Card } from "@gradual/ui/card";
import { Skeleton } from "@gradual/ui/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { Suspense, useMemo } from "react";
import { useTRPC } from "@/lib/trpc";
import FlagHeader from "./flag-header";
import { flagSearchParams } from "./flag-search-params";
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
        return <FlagVariations />;
      case "metrics":
        return <FlagMetrics />;
      case "events":
        return <FlagEvents />;
      case "settings":
        return <FlagSettings />;
      default:
        return null;
    }
  }, [tab, flag, environment, organizationSlug, projectSlug]);

  return (
    <div className="h-full overflow-y-auto">
      <FlagHeader
        flag={{ flag: flag.flag, maintainer: flag.maintainer }}
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
      />
      <FlagSubheader environments={flag.environments} />
      <Suspense fallback={<TabContentSkeleton />}>
        <div className="flex min-h-[calc(70vh-0.5rem)] w-full flex-1 flex-col">
          {renderTabContent}
        </div>
      </Suspense>
    </div>
  );
}

function TabContentSkeleton() {
  return (
    <div className="flex w-full flex-1 flex-col p-3 sm:p-4">
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
            <div className="flex min-h-[calc(56vh-0.5rem)] w-full flex-col items-center justify-start gap-3 px-2 py-4 sm:px-0">
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
