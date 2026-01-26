import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { useTRPC } from "@/lib/trpc";
import FlagHeader from "./flag-header";
import { flagSearchParams } from "./flag-search-params";
import FlagSubheader from "./flag-subheader";

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
  const [{ tab }] = useQueryStates(flagSearchParams);

  const { data: flag } = useSuspenseQuery(
    trpc.featureFlags.getByKey.queryOptions({
      projectSlug,
      organizationSlug,
      key: flagSlug,
    })
  );

  const renderTabContent = () => {
    switch (tab) {
      case "targeting":
        return <div>Targeting content</div>;
      case "variations":
        return <div>Variations content</div>;
      case "metrics":
        return <div>Metrics content</div>;
      case "events":
        return <div>Events content</div>;
      case "settings":
        return <div>Settings content</div>;
      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <FlagHeader flag={{ flag: flag.flag, maintainer: flag.maintainer }} />
      <FlagSubheader environments={flag.environments} />
      <div className="p-6">{renderTabContent()}</div>
    </div>
  );
}
