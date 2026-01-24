import { Button } from "@gradual/ui/button";
import { Skeleton } from "@gradual/ui/skeleton";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import EmptyFlagsList from "./empty-state";
import FlagListItem from "./flag-list-item";

interface FlagsListProps {
  projectSlug: string;
  organizationSlug: string;
}

const ids = [
  "48221c0e-ad23-46be-827d-efb9a72625a7",
  "585670c0-0b20-4c73-a1dc-27f5613bd423",
  "75665bb7-4e68-4d0f-a537-617de034e218",
  "7e31f80b-4f47-4c05-a5b8-871b84c3e8c8",
  "846050a0-4cdb-482d-985a-90cd0db06995",
  "ab377c09-4e5e-47bc-81f0-0c53b24f6f0f",
  "ed7f7057-9de7-450a-a89a-4080564943c8",
];

export default function FlagsList({
  projectSlug,
  organizationSlug,
}: FlagsListProps) {
  const trpc = useTRPC();
  const { data: flags } = useSuspenseQuery(
    trpc.featureFlags.getAll.queryOptions({ projectSlug, organizationSlug })
  );

  const { mutateAsync: insertFakeEvaluations } = useMutation(
    trpc.featureFlags.insertFakeEvaluations.mutationOptions()
  );

  if (flags.data.length === 0) {
    return <EmptyFlagsList />;
  }

  return (
    <div className="flex flex-col divide-y">
      <EmptyFlagsList />
      <Button
        onClick={() =>
          insertFakeEvaluations({ organizationSlug, flagIds: ids })
        }
      >
        Insert Fake Evaluations
      </Button>
      {flags.data.map((flag) => (
        <FlagListItem flag={flag} key={flag.id} />
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
