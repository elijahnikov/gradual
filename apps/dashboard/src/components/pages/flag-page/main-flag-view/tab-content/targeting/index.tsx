import type { RouterOutputs } from "@gradual/api";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { Text } from "@gradual/ui/text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import { RiArrowGoBackFill } from "@remixicon/react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useTRPC } from "@/lib/trpc";
import DefaultVariation from "./default-variation";
import { IndividualTargetCard } from "./individual-target-card";
import { ReviewChangesModal } from "./review-changes-modal";
import { RuleTargetCard } from "./rule-target-card";
import { SegmentTargetCard } from "./segment-target-card";
import { TargetingList } from "./targeting-list";
import {
  type LocalTarget,
  TargetingStoreProvider,
  useTargetingStore,
} from "./targeting-store";
import type { ContextKind, TargetingOperator } from "./types";

interface FlagTargetingProps {
  flag: RouterOutputs["featureFlags"]["getByKey"];
  environmentSlug: string;
  organizationSlug: string;
  projectSlug: string;
}

const DOTTED_BACKGROUND_STYLE_LIGHT = {
  backgroundImage:
    "radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.35) 1px, transparent 0)",
  backgroundSize: "20px 20px",
} as const;

const DOTTED_BACKGROUND_STYLE_DARK = {
  backgroundImage:
    "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)",
  backgroundSize: "20px 20px",
} as const;

export default function FlagTargeting(props: FlagTargetingProps) {
  return (
    <TargetingStoreProvider key={props.environmentSlug}>
      <FlagTargetingContent {...props} />
    </TargetingStoreProvider>
  );
}

function FlagTargetingContent({
  flag,
  environmentSlug,
  organizationSlug,
  projectSlug,
}: FlagTargetingProps) {
  const trpc = useTRPC();
  const { data: flagEnvironment } = useSuspenseQuery(
    trpc.featureFlags.getTargetingRules.queryOptions({
      flagId: flag.flag.id,
      environmentSlug,
      organizationSlug,
      projectSlug,
    })
  );

  const { data: attributes = [] } = useQuery(
    trpc.attributes.list.queryOptions({
      projectSlug,
      organizationSlug,
    })
  );

  const { data: contexts = [] } = useQuery(
    trpc.attributes.listContexts.queryOptions({
      projectSlug,
      organizationSlug,
    })
  );

  const { data: segments = [] } = useQuery(
    trpc.segments.list.queryOptions({
      projectSlug,
      organizationSlug,
    })
  );

  const defaultVariationId = flag.variations[0]?.id ?? "";

  const existingTargets = useMemo((): LocalTarget[] => {
    const contextIdToKind = new Map<string, ContextKind>();
    for (const ctx of contexts) {
      contextIdToKind.set(ctx.id, ctx.kind as ContextKind);
    }

    const attributeByKey = new Map<string, (typeof attributes)[number]>();
    for (const attr of attributes) {
      attributeByKey.set(attr.key, attr);
    }

    return flagEnvironment.targets.map((target) => {
      const base: LocalTarget = {
        id: target.id,
        type: target.type,
        name: target.name,
        variationId: target.variationId,
      };

      if (target.type === "rule" && target.rule) {
        base.conditions = [
          {
            attributeKey: target.rule.attributeKey,
            operator: target.rule.operator as TargetingOperator,
            value: target.rule.value,
          },
        ];
      } else if (target.type === "individual" && target.individual) {
        base.attributeKey = target.individual.attributeKey;
        base.attributeValue = target.individual.attributeValue;
        const attribute = attributeByKey.get(target.individual.attributeKey);
        if (attribute?.contextId) {
          const contextKind = contextIdToKind.get(attribute.contextId);
          if (contextKind) {
            base.contextKind = contextKind;
          }
        }
      } else if (target.type === "segment" && target.segment) {
        base.segmentId = target.segment.segmentId;
      }

      return base;
    });
  }, [flagEnvironment.targets, attributes, contexts]);

  const initialize = useTargetingStore((s) => s.initialize);
  const targets = useTargetingStore((s) => s.targets);
  const addTarget = useTargetingStore((s) => s.addTarget);
  const defaultVariationIdState = useTargetingStore(
    (s) => s.defaultVariationIdState
  );
  const setDefaultVariation = useTargetingStore((s) => s.setDefaultVariation);
  const hasChanges = useTargetingStore((s) => s.hasChanges);
  const openReviewModal = useTargetingStore((s) => s.openReviewModal);
  const reset = useTargetingStore((s) => s.reset);

  useEffect(() => {
    initialize({
      attributes,
      contexts,
      segments,
      variations: flag.variations,
      organizationSlug,
      projectSlug,
      defaultVariationId:
        flagEnvironment.defaultVariation?.id ?? defaultVariationId,
      flagId: flag.flag.id,
      environmentSlug,
      existingTargets,
    });
  }, [
    initialize,
    attributes,
    contexts,
    segments,
    flag.variations,
    flag.flag.id,
    organizationSlug,
    projectSlug,
    environmentSlug,
    flagEnvironment.defaultVariation?.id,
    defaultVariationId,
    existingTargets,
  ]);

  return (
    <div className="flex w-full flex-1 flex-col p-3 sm:p-3">
      <Card className="flex h-full w-full flex-1 flex-col p-0">
        <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
          <Text weight="plus">Targeting rules for {environmentSlug}</Text>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      className="size-6"
                      disabled={!hasChanges}
                      onClick={reset}
                      size="small"
                      variant="outline"
                    />
                  }
                >
                  <RiArrowGoBackFill className="size-4 shrink-0" />
                </TooltipTrigger>
                <TooltipContent>Reset changes</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              className="w-full sm:w-auto"
              disabled={!hasChanges}
              onClick={openReviewModal}
              size="small"
              variant="gradual"
            >
              Review and save
            </Button>
          </div>
        </div>
        <div className="flex h-full w-full flex-1 flex-col rounded-md border-t bg-ui-bg-base p-1 sm:p-2">
          <div className="flex h-full w-full flex-1 flex-col rounded-md border bg-ui-bg-base p-1 sm:p-2">
            <div className="relative flex h-full min-h-[calc(100vh-14rem)] w-full flex-col items-center justify-start overflow-hidden bg-white dark:bg-ui-bg-base">
              <div className="relative z-20 flex h-full w-full flex-col items-center px-2 sm:px-0">
                <TargetingList
                  footer={
                    flagEnvironment.defaultVariation && (
                      <DefaultVariation
                        defaultVariationId={defaultVariationIdState}
                        onDefaultVariationChange={setDefaultVariation}
                      />
                    )
                  }
                  onAddTarget={addTarget}
                >
                  {targets.map((target) => (
                    <TargetCard key={target.id} target={target} />
                  ))}
                </TargetingList>
              </div>
              <div
                className="absolute inset-0 z-0 hidden translate-x-2 translate-y-2 opacity-50 sm:block dark:hidden"
                style={DOTTED_BACKGROUND_STYLE_LIGHT}
              />
              <div
                className="absolute inset-0 z-0 hidden translate-x-2 translate-y-2 opacity-50 sm:dark:block"
                style={DOTTED_BACKGROUND_STYLE_DARK}
              />
            </div>
          </div>
        </div>
      </Card>
      <ReviewChangesModal />
    </div>
  );
}

function TargetCard({ target }: { target: LocalTarget }) {
  switch (target.type) {
    case "rule":
      return <RuleTargetCard targetId={target.id} />;
    case "individual":
      return <IndividualTargetCard targetId={target.id} />;
    case "segment":
      return <SegmentTargetCard targetId={target.id} />;
    default:
      return null;
  }
}
