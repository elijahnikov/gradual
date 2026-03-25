import type { RouterOutputs } from "@gradual/api";
import { Button } from "@gradual/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import { Separator } from "@gradual/ui/separator";
import { Text } from "@gradual/ui/text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import {
  RiArrowGoBackFill,
  RiFileCopyLine,
  RiLoader4Line,
} from "@remixicon/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import {
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  backgroundSize: "16px 16px",
} as const;

const DOTTED_BACKGROUND_STYLE_DARK = {
  backgroundImage:
    "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)",
  backgroundSize: "16px 16px",
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

  const { data: segmentsData } = useQuery(
    trpc.segments.list.queryOptions({
      projectSlug,
      organizationSlug,
    })
  );
  const segments = segmentsData?.items ?? [];

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
          schedule: target.rollout.schedule
            ? (
                target.rollout.schedule as Array<{
                  durationMinutes: number;
                  variations: Array<{
                    variationId: string;
                    weight: number;
                  }>;
                }>
              ).map((step) => ({
                durationMinutes: step.durationMinutes,
                variations: step.variations.map((sv) => ({
                  variationId: sv.variationId,
                  weight: sv.weight,
                })),
              }))
            : undefined,
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

  const otherEnvironments = useMemo(
    () =>
      flag.environments
        .filter((e) => e.environment.slug !== environmentSlug)
        .map((e) => e.environment),
    [flag.environments, environmentSlug]
  );

  const { canUpdateFlags } = usePermissions();
  const initialize = useTargetingStore((s) => s.initialize);
  const targets = useTargetingStore((s) => s.targets);
  const addTarget = useTargetingStore((s) => s.addTarget);
  const hasChanges = useTargetingStore((s) => s.hasChanges);
  const openReviewModal = useTargetingStore((s) => s.openReviewModal);
  const reset = useTargetingStore((s) => s.reset);
  const enabled = useTargetingStore((s) => s.enabled);
  const loadFromEnvironment = useTargetingStore((s) => s.loadFromEnvironment);

  const queryClient = useQueryClient();
  const [isCopying, setIsCopying] = useState(false);

  const handleCopyFrom = useCallback(
    async (sourceEnvSlug: string) => {
      setIsCopying(true);
      try {
        const sourceConfig = await queryClient.fetchQuery(
          trpc.featureFlags.getTargetingRules.queryOptions({
            flagId: flag.flag.id,
            environmentSlug: sourceEnvSlug,
            organizationSlug,
            projectSlug,
          })
        );

        const copiedTargets: LocalTarget[] = sourceConfig.targets.map(
          (target) => {
            const base: LocalTarget = {
              id: crypto.randomUUID(),
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
                schedule: target.rollout.schedule
                  ? (
                      target.rollout.schedule as Array<{
                        durationMinutes: number;
                        variations: Array<{
                          variationId: string;
                          weight: number;
                        }>;
                      }>
                    ).map((step) => ({
                      durationMinutes: step.durationMinutes,
                      variations: step.variations.map((sv) => ({
                        variationId: sv.variationId,
                        weight: sv.weight,
                      })),
                    }))
                  : undefined,
              };
            }

            if (
              target.type === "rule" &&
              target.rules &&
              target.rules.length > 0
            ) {
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
          }
        );

        const copiedDefaultRollout = sourceConfig.defaultRollout
          ? {
              variations: sourceConfig.defaultRollout.variations.map((rv) => ({
                variationId: rv.variationId,
                weight: rv.weight,
              })),
              bucketContextKind: sourceConfig.defaultRollout.bucketContextKind,
              bucketAttributeKey:
                sourceConfig.defaultRollout.bucketAttributeKey,
              seed: sourceConfig.defaultRollout.seed ?? undefined,
              schedule: sourceConfig.defaultRollout.schedule
                ? (
                    sourceConfig.defaultRollout.schedule as Array<{
                      durationMinutes: number;
                      variations: Array<{
                        variationId: string;
                        weight: number;
                      }>;
                    }>
                  ).map((step) => ({
                    durationMinutes: step.durationMinutes,
                    variations: step.variations.map((sv) => ({
                      variationId: sv.variationId,
                      weight: sv.weight,
                    })),
                  }))
                : undefined,
            }
          : null;

        loadFromEnvironment({
          targets: copiedTargets,
          defaultVariationId:
            sourceConfig.defaultVariation?.id ?? defaultVariationId,
          defaultRollout: copiedDefaultRollout,
          enabled: sourceConfig.enabled,
          offVariationId: sourceConfig.offVariationId,
        });
      } finally {
        setIsCopying(false);
      }
    },
    [
      queryClient,
      trpc,
      flag.flag.id,
      organizationSlug,
      projectSlug,
      defaultVariationId,
      loadFromEnvironment,
    ]
  );

  const validationErrors = useMemo(
    () => getValidationErrors(targets),
    [targets]
  );
  const hasValidationErrors = validationErrors.size > 0;

  const handleSaveHotkey = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault();
      if (hasChanges && !hasValidationErrors && canUpdateFlags) {
        openReviewModal();
      }
    },
    [hasChanges, hasValidationErrors, canUpdateFlags, openReviewModal]
  );

  useHotkey("Mod+S", handleSaveHotkey);

  const existingDefaultRollout = useMemo(() => {
    if (!flagEnvironment.defaultRollout) {
      return null;
    }
    const dr = flagEnvironment.defaultRollout;
    return {
      variations: dr.variations.map((rv) => ({
        variationId: rv.variationId,
        weight: rv.weight,
      })),
      bucketContextKind: dr.bucketContextKind,
      bucketAttributeKey: dr.bucketAttributeKey,
      seed: dr.seed ?? undefined,
      schedule: dr.schedule
        ? (
            dr.schedule as Array<{
              durationMinutes: number;
              variations: Array<{ variationId: string; weight: number }>;
            }>
          ).map((step) => ({
            durationMinutes: step.durationMinutes,
            variations: step.variations.map((sv) => ({
              variationId: sv.variationId,
              weight: sv.weight,
            })),
          }))
        : undefined,
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
    <div className="flex w-full flex-1 flex-col items-center justify-center">
      <div className="flex h-full w-full flex-1 flex-col p-0">
        <div className="flex h-12.5 flex-col gap-2 px-2.5 sm:flex-row sm:items-center sm:justify-between">
          <Text weight="plus">Targeting rules for {environmentSlug}</Text>
          <div className="flex items-center gap-2">
            {otherEnvironments.length > 0 && canUpdateFlags && (
              <DropdownMenu>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <DropdownMenuTrigger
                          className="flex size-6 items-center justify-center rounded-[6px] border border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-base-hover disabled:opacity-50"
                          disabled={isCopying}
                        />
                      }
                    >
                      {isCopying ? (
                        <RiLoader4Line className="size-3.5 shrink-0 animate-spin" />
                      ) : (
                        <RiFileCopyLine className="size-3.5 shrink-0" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>Copy from environment</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Copy targeting from</DropdownMenuLabel>
                    {otherEnvironments.map((env) => (
                      <DropdownMenuItem
                        key={env.slug}
                        onClick={() => handleCopyFrom(env.slug)}
                      >
                        <span
                          className="mr-1 size-3.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: env.color ?? undefined,
                          }}
                        />
                        {env.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Separator orientation="vertical" />
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
                    size="xsmall"
                    variant="gradual"
                  >
                    Review and save
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="flex items-center">
                  {hasChanges && hasValidationErrors
                    ? [...validationErrors.values()].flat()[0]
                    : "Review and save"}
                  <kbd className="relative -top-0.25 ml-1.5 rounded border border-ui-border-base bg-ui-bg-base px-1 py-0.5 font-mono text-[10px] text-ui-fg-base">
                    {"⌘S"}
                  </kbd>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex h-full w-full flex-1 flex-col border-t bg-ui-bg-base">
          <div className="relative flex h-full min-h-[calc(100vh-15rem)] w-full flex-col items-center justify-start overflow-hidden bg-ui-bg-base">
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
