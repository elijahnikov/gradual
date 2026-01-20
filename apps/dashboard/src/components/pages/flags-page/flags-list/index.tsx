import { Skeleton } from "@gradual/ui/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
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
      <h1>Flags</h1>
      <pre>{JSON.stringify(flags, null, 2)}</pre>
      <h1>Flags</h1>
      <pre>{JSON.stringify(flags, null, 2)}</pre>
      <h1>Flags</h1>
      <pre>{JSON.stringify(flags, null, 2)}</pre>
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
