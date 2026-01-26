import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import FlagHeader from "./flag-header";
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

  const { data: flag } = useSuspenseQuery(
    trpc.featureFlags.getByKey.queryOptions({
      projectSlug,
      organizationSlug,
      key: flagSlug,
    })
  );

  return (
    <div className="h-full overflow-y-auto">
      <FlagHeader flag={{ flag: flag.flag, maintainer: flag.maintainer }} />
      <FlagSubheader />
      {/* <div className="p-6">
        <pre>{JSON.stringify(flag, null, 2)}</pre>
        <pre>{JSON.stringify(flag, null, 2)}</pre>
      </div> */}
    </div>
  );
}
