import type { RouterOutputs } from "@gradual/api";
import { getVariationColorByIndex } from "@gradual/api/utils";
import { Button } from "@gradual/ui/button";
import { toastManager } from "@gradual/ui/toast";
import { RiAddLine } from "@remixicon/react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
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
  const newVariationRef = useRef<HTMLDivElement>(null);
  const [scrollToNew, setScrollToNew] = useState(false);

  const variationsQueryOptions = trpc.featureFlags.getVariations.queryOptions({
    flagId: flag.flag.id,
    projectSlug,
    organizationSlug,
  });

  const { data: variations } = useSuspenseQuery(variationsQueryOptions);

  const flagType = flag.flag.type as FlagType;

  useEffect(() => {
    if (scrollToNew && newVariationRef.current) {
      newVariationRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setScrollToNew(false);
    }
  }, [scrollToNew]);

  const addMutation = useMutation(
    trpc.featureFlags.addVariation.mutationOptions({
      onMutate: async (newVariation) => {
        await queryClient.cancelQueries({
          queryKey: variationsQueryOptions.queryKey,
        });

        const previousVariations = queryClient.getQueryData<Variation[]>(
          variationsQueryOptions.queryKey
        );

        if (previousVariations) {
          const optimisticVariation: Variation = {
            id: `temp-${Date.now()}`,
            featureFlagId: flag.flag.id,
            name: newVariation.name,
            value: newVariation.value,
            description: newVariation.description ?? null,
            color: newVariation.color ?? null,
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
      onSuccess: () => {
        setTimeout(() => setScrollToNew(true), 50);
      },
      onError: (error, _variables, context) => {
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
      color: getVariationColorByIndex(variations.length),
    });
  };

  return (
    <div className="flex w-full flex-1 flex-col p-2 sm:p-2">
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
        {variations.map((variation, index) => {
          const isLast = index === variations.length - 1;
          return (
            <div key={variation.id} ref={isLast ? newVariationRef : undefined}>
              <VariationsItem
                flagId={flag.flag.id}
                flagType={flagType}
                organizationSlug={organizationSlug}
                projectSlug={projectSlug}
                variation={variation}
                variationCount={variations.length}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
