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

function TabContentSkeleton() {
  return (
    <div className="flex w-full flex-1 flex-col p-6">
      <Card className="flex h-full w-full flex-1 flex-col p-0">
        <div className="flex items-center justify-between p-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
        <div className="flex h-full w-full flex-1 flex-col rounded-md border-t bg-ui-bg-base p-2">
          <div className="flex h-full w-full flex-1 flex-col rounded-md border bg-ui-bg-base p-2">
            <div className="flex min-h-[calc(56vh-0.5rem)] w-full flex-col items-center justify-start gap-4 p-4">
              <Skeleton className="h-24 w-full max-w-md rounded-lg" />
              <Skeleton className="h-24 w-full max-w-md rounded-lg" />
              <Skeleton className="h-16 w-full max-w-md rounded-lg" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

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

  console.log({ flag });
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
      <FlagHeader flag={{ flag: flag.flag, maintainer: flag.maintainer }} />
      <FlagSubheader environments={flag.environments} />
      <Suspense fallback={<TabContentSkeleton />}>
        <div className="flex min-h-[calc(70vh-0.5rem)] w-full flex-1 flex-col">
          {renderTabContent}
        </div>
      </Suspense>
    </div>
  );
}
