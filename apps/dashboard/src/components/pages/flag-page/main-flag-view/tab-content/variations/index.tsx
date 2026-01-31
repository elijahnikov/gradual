import type { RouterOutputs } from "@gradual/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import VariationsItem from "./variations-item";

interface FlagVariationsProps {
  flag: RouterOutputs["featureFlags"]["getByKey"];
  organizationSlug: string;
  projectSlug: string;
}

export default function FlagVariations({
  flag,
  organizationSlug,
  projectSlug,
}: FlagVariationsProps) {
  const trpc = useTRPC();
  const { data: variations } = useSuspenseQuery(
    trpc.featureFlags.getVariations.queryOptions({
      flagId: flag.flag.id,
      projectSlug,
      organizationSlug,
    })
  );

  return (
    <div className="flex flex-col gap-4 p-3">
      {variations.map((variation) => (
        <VariationsItem key={variation.id} variation={variation} />
      ))}
    </div>
  );
}
