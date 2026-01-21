import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";

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
    <div>
      <pre>{JSON.stringify(flag, null, 2)}</pre>
    </div>
  );
}
