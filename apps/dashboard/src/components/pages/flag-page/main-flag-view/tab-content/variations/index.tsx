import type { RouterOutputs } from "@gradual/api";
import { Button } from "@gradual/ui/button";
import { toastManager } from "@gradual/ui/toast";
import { RiAddLine } from "@remixicon/react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import VariationsItem from "./variations-item";

type FlagType = "boolean" | "string" | "number" | "json";
type Variation = RouterOutputs["featureFlags"]["getVariations"][number];

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
  const queryClient = useQueryClient();

  const variationsQueryOptions = trpc.featureFlags.getVariations.queryOptions({
    flagId: flag.flag.id,
    projectSlug,
    organizationSlug,
  });

  const { data: variations } = useSuspenseQuery(variationsQueryOptions);

  const flagType = flag.flag.type as FlagType;

  const addMutation = useMutation(
    trpc.featureFlags.addVariation.mutationOptions({
      onMutate: async (newVariation) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({
          queryKey: variationsQueryOptions.queryKey,
        });

        // Snapshot previous value
        const previousVariations = queryClient.getQueryData<Variation[]>(
          variationsQueryOptions.queryKey
        );

        // Optimistically add the new variation
        if (previousVariations) {
          const optimisticVariation: Variation = {
            id: `temp-${Date.now()}`,
            featureFlagId: flag.flag.id,
            name: newVariation.name,
            value: newVariation.value,
            description: newVariation.description ?? null,
            isDefault: false,
            rolloutPercentage: 0,
            sortOrder: previousVariations.length,
            createdAt: new Date(),
            updatedAt: new Date(),
            evaluationCount: 0,
          };

          queryClient.setQueryData<Variation[]>(
            variationsQueryOptions.queryKey,
            [...previousVariations, optimisticVariation]
          );
        }

        return { previousVariations };
      },
      onError: (error, _variables, context) => {
        // Rollback on error
        if (context?.previousVariations) {
          queryClient.setQueryData(
            variationsQueryOptions.queryKey,
            context.previousVariations
          );
        }
        toastManager.add({
          title: "Failed to create variation",
          description: error.message,
          type: "error",
        });
      },
      onSettled: () => {
        // Refetch to get the real data
        queryClient.invalidateQueries({
          queryKey: variationsQueryOptions.queryKey,
        });
      },
    })
  );

  const handleAddVariation = () => {
    const defaultValue =
      flagType === "string"
        ? `variation-value-${variations.length + 1}`
        : flagType === "number"
          ? variations.length + 1
          : {};

    addMutation.mutate({
      flagId: flag.flag.id,
      projectSlug,
      organizationSlug,
      name: `Variation ${variations.length + 1}`,
      value: defaultValue,
    });
  };

  return (
    <div className="flex w-full flex-1 flex-col p-3 sm:p-3">
      {flagType !== "boolean" && (
        <div className="mb-3 flex justify-end">
          <Button
            disabled={addMutation.isPending}
            onClick={handleAddVariation}
            size="small"
            variant="outline"
          >
            <RiAddLine className="size-4" />
            Add Variation
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {variations.map((variation) => (
          <VariationsItem
            flagId={flag.flag.id}
            flagType={flagType}
            key={variation.id}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            variation={variation}
            variationCount={variations.length}
          />
        ))}
      </div>
    </div>
  );
}
