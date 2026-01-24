import { Skeleton } from "@gradual/ui/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import EmptyFlagsList from "./empty-state";
import FlagListItem from "./flag-list-item";

interface FlagsListProps {
  projectSlug: string;
  organizationSlug: string;
}

const _ids = [
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
  // const { mutate: seedEvaluations } = useMutation(
  //   trpc.featureFlags.seedEvaluations.mutationOptions()
  // );

  if (flags.data.length === 0) {
    return <EmptyFlagsList />;
  }

  return (
    <div className="flex flex-col divide-y">
      {flags.data.map((flag) => (
        <FlagListItem flag={flag} key={flag.id} />
      ))}
      {/* {flags.data[0] && (
        <Button
          onClick={() =>
            seedEvaluations({
              flagId: flags.data[0]?.id ?? "",
              organizationId: flags.data[0]?.organizationId ?? "",
              projectId: flags.data[0]?.projectId ?? "",
              count: 500,
            })
          }
          variant="gradual"
        >
          Seed Evaluations
        </Button>
      )} */}
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
