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
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useTRPC } from "@/lib/trpc";
import DefaultVariation from "./default-variation";
import { IndividualTargetCard } from "./individual-target-card";
import { ReviewChangesModal } from "./review-changes-modal";
import { RuleTargetCard } from "./rule-target-card";
import { SegmentTargetCard } from "./segment-target-card";
import { TargetingList } from "./targeting-list";
import {
  getValidationErrors,
  type LocalTarget,
  TargetingStoreProvider,
  useTargetingStore,
} from "./targeting-store";
import type { TargetingOperator } from "./types";

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
    return flagEnvironment.targets.map((target) => {
      const base: LocalTarget = {
        id: target.id,
        type: target.type,
        name: target.name,
      };

      if (target.variationId) {
        base.variationId = target.variationId;
      } else if (target.rollout && target.rollout.variations.length > 0) {
        base.rollout = {
          variations: target.rollout.variations.map((rv) => ({
            variationId: rv.variationId,
            weight: rv.weight,
          })),
          bucketContextKind: target.rollout.bucketContextKind,
          bucketAttributeKey: target.rollout.bucketAttributeKey,
          seed: target.rollout.seed ?? undefined,
        };
      }

      if (target.type === "rule" && target.rules && target.rules.length > 0) {
        base.conditions = target.rules.map((rule) => ({
          contextKind: rule.contextKind,
          attributeKey: rule.attributeKey,
          operator: rule.operator as TargetingOperator,
          value: rule.value,
        }));
      } else if (target.type === "individual" && target.individual) {
        base.contextKind = target.individual.contextKind;
        base.attributeKey = target.individual.attributeKey;
        base.attributeValue = target.individual.attributeValue;
      } else if (target.type === "segment" && target.segment) {
        base.segmentId = target.segment.segmentId;
      }

      return base;
    });
  }, [flagEnvironment.targets]);

  const { canUpdateFlags } = usePermissions();
  const initialize = useTargetingStore((s) => s.initialize);
  const targets = useTargetingStore((s) => s.targets);
  const addTarget = useTargetingStore((s) => s.addTarget);
  const hasChanges = useTargetingStore((s) => s.hasChanges);
  const openReviewModal = useTargetingStore((s) => s.openReviewModal);
  const reset = useTargetingStore((s) => s.reset);
  const enabled = useTargetingStore((s) => s.enabled);

  const validationErrors = useMemo(
    () => getValidationErrors(targets),
    [targets]
  );
  const hasValidationErrors = validationErrors.size > 0;

  const existingDefaultRollout = useMemo(() => {
    if (!flagEnvironment.defaultRollout) {
      return null;
    }
    return {
      variations: flagEnvironment.defaultRollout.variations.map((rv) => ({
        variationId: rv.variationId,
        weight: rv.weight,
      })),
      bucketContextKind: flagEnvironment.defaultRollout.bucketContextKind,
      bucketAttributeKey: flagEnvironment.defaultRollout.bucketAttributeKey,
      seed: flagEnvironment.defaultRollout.seed ?? undefined,
    };
  }, [flagEnvironment.defaultRollout]);

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
      defaultRollout: existingDefaultRollout,
      enabled: flagEnvironment.enabled,
      offVariationId: flagEnvironment.offVariationId,
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
    flagEnvironment.enabled,
    flagEnvironment.offVariationId,
    defaultVariationId,
    existingDefaultRollout,
    existingTargets,
  ]);

  return (
    <div className="flex w-full flex-1 flex-col px-2">
      <div className="flex h-full w-full flex-1 flex-col p-0">
        <div className="mb-1 flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
          <Text className="ml-1" weight="plus">
            Targeting rules for {environmentSlug}
          </Text>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      className="size-6"
                      disabled={!(hasChanges && canUpdateFlags)}
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
            <TooltipProvider delay={100}>
              <Tooltip>
                <TooltipTrigger
                  render={<span className="inline-flex cursor-not-allowed" />}
                >
                  <Button
                    className="w-full sm:w-auto"
                    disabled={
                      !hasChanges || hasValidationErrors || !canUpdateFlags
                    }
                    onClick={openReviewModal}
                    size="small"
                    variant="default"
                  >
                    Review and save
                  </Button>
                </TooltipTrigger>
                {hasChanges && hasValidationErrors && (
                  <TooltipContent>
                    {[...validationErrors.values()].flat()[0]}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <Card className="mb-2 flex h-full w-full flex-1 flex-col rounded-md bg-ui-bg-subtle p-1 sm:p-2">
          <div className="flex h-full w-full flex-1 flex-col rounded-md border bg-ui-bg-base p-1 sm:p-2">
            <div className="relative flex h-full min-h-[calc(100vh-14rem)] w-full flex-col items-center justify-start overflow-hidden bg-white dark:bg-ui-bg-base">
              <div className="relative z-20 flex h-full w-full flex-col items-center px-2 sm:px-0">
                <TargetingList
                  collapsed={!enabled}
                  disabled={!(canUpdateFlags && enabled)}
                  footer={
                    (flagEnvironment.defaultVariation ||
                      flagEnvironment.defaultRollout) && (
                      <DefaultVariation disabled={!canUpdateFlags} />
                    )
                  }
                  onAddTarget={addTarget}
                >
                  {targets.map((target) => (
                    <TargetCard
                      hasError={validationErrors.has(target.id)}
                      key={target.id}
                      target={target}
                    />
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
        </Card>
      </div>
      <ReviewChangesModal />
    </div>
  );
}

function TargetCard({
  target,
  hasError,
}: {
  target: LocalTarget;
  hasError: boolean;
}) {
  switch (target.type) {
    case "rule":
      return <RuleTargetCard hasError={hasError} targetId={target.id} />;
    case "individual":
      return <IndividualTargetCard hasError={hasError} targetId={target.id} />;
    case "segment":
      return <SegmentTargetCard hasError={hasError} targetId={target.id} />;
    default:
      return null;
  }
}
