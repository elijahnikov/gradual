import { Button } from "@gradual/ui/button";
import { Skeleton } from "@gradual/ui/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTRPC } from "@/lib/trpc";
import EmptyFlagsList from "./empty-state";

interface FlagsListProps {
  projectSlug: string;
  organizationSlug: string;
}

export default function FlagsList({
  projectSlug,
  organizationSlug,
}: FlagsListProps) {
  const trpc = useTRPC();
  const { data: flags } = useSuspenseQuery(
    trpc.featureFlags.getAll.queryOptions({ projectSlug, organizationSlug })
  );

  if (flags.data.length === 0) {
    return <EmptyFlagsList />;
  }

  return (
    <div>
      <EmptyFlagsList />
      {flags.data.map((flag) => (
        <div key={flag.id}>
          <Button
            render={
              <Link
                params={{ organizationSlug, projectSlug, flagSlug: flag.key }}
                preload="intent"
                to={"/$organizationSlug/$projectSlug/flags/$flagSlug"}
              />
            }
          >
            {flag.name}
          </Button>
        </div>
      ))}
    </div>
  );
}

export function FlagsListSkeleton() {
  return (
    <div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
