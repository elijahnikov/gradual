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

  console.log({ flag, environment, organizationSlug, projectSlug });
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
      <Suspense fallback={<div>Loading...</div>}>
        <div className="flex min-h-[calc(70vh-0.5rem)] w-full flex-1 flex-col">
          {renderTabContent}
        </div>
      </Suspense>
    </div>
  );
}
