import { cn } from "@gradual/ui";
import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@gradual/ui/dialog";
import { Heading } from "@gradual/ui/heading";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Separator } from "@gradual/ui/separator";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import {
  RiAddLine,
  RiArrowRightLine,
  RiDeleteBinLine,
  RiDragMove2Fill,
  RiPencilLine,
} from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import _ from "lodash";
import { useMemo } from "react";
import { useTRPC } from "@/lib/trpc";
import { type LocalTarget, useTargetingStore } from "./targeting-store";
import { OPERATOR_LABELS, type RuleCondition } from "./types";

interface DiffItem {
  type: "added" | "removed" | "modified";
  target: LocalTarget;
  originalTarget?: LocalTarget;
}

interface OrderChange {
  id: string;
  name: string;
  oldPosition: number;
  newPosition: number;
}

function computeDiff(
  original: LocalTarget[],
  current: LocalTarget[]
): DiffItem[] {
  const diffs: DiffItem[] = [];
  const originalMap = new Map(original.map((t) => [t.id, t]));
  const currentMap = new Map(current.map((t) => [t.id, t]));

  for (const orig of original) {
    if (!currentMap.has(orig.id)) {
      diffs.push({ type: "removed", target: orig });
    }
  }

  for (const curr of current) {
    const orig = originalMap.get(curr.id);
    if (!orig) {
      diffs.push({ type: "added", target: curr });
    } else if (JSON.stringify(orig) !== JSON.stringify(curr)) {
      diffs.push({ type: "modified", target: curr, originalTarget: orig });
    }
  }

  return diffs;
}

function computeOrderChanges(
  original: LocalTarget[],
  current: LocalTarget[]
): OrderChange[] {
  const changes: OrderChange[] = [];
  const originalPositions = new Map(original.map((t, i) => [t.id, i]));

  for (let i = 0; i < current.length; i++) {
    const target = current[i];
    if (!target) {
      continue;
    }
    const oldPosition = originalPositions.get(target.id);

    if (oldPosition !== undefined && oldPosition !== i) {
      changes.push({
        id: target.id,
        name: target.name,
        oldPosition: oldPosition + 1,
        newPosition: i + 1,
      });
    }
  }

  return changes;
}

function DiffIcon({ type }: { type: DiffItem["type"] }) {
  switch (type) {
    case "added":
      return <RiAddLine className="size-4 text-success-foreground" />;
    case "removed":
      return <RiDeleteBinLine className="size-4 text-destructive-foreground" />;
    case "modified":
      return <RiPencilLine className="size-4 text-warning-foreground" />;
    default:
      return null;
  }
}

function DiffBadge({ type }: { type: DiffItem["type"] }) {
  const config = {
    added: { label: "Added", variant: "success" as const },
    removed: { label: "Removed", variant: "error" as const },
    modified: { label: "Modified", variant: "warning" as const },
  };
  const { label, variant } = config[type];
  return <Badge variant={variant}>{label}</Badge>;
}

function FieldChange({
  label,
  oldValue,
  newValue,
}: {
  label: string;
  oldValue?: string;
  newValue: string;
}) {
  const hasChanged = oldValue !== undefined && oldValue !== newValue;

  return (
    <Text className="text-ui-fg-muted" size="xsmall">
      {label}{" "}
      {hasChanged && (
        <>
          <span className="text-ui-fg-disabled line-through">{oldValue}</span>
          <RiArrowRightLine className="mx-1 inline size-3 text-ui-fg-disabled" />
        </>
      )}
      <span className="font-medium text-ui-fg-subtle">{newValue}</span>
    </Text>
  );
}

function formatOperator(op: string): string {
  return OPERATOR_LABELS[op as keyof typeof OPERATOR_LABELS] ?? op;
}

function ConditionDisplay({
  condition,
  originalCondition,
  index,
}: {
  condition: RuleCondition;
  originalCondition?: RuleCondition;
  index: number;
}) {
  const prefix = index === 0 ? "If" : "and";

  const attrChanged =
    originalCondition &&
    originalCondition.attributeKey !== condition.attributeKey;
  const opChanged =
    originalCondition && originalCondition.operator !== condition.operator;
  const valueChanged =
    originalCondition &&
    String(originalCondition.value) !== String(condition.value);

  const isNew = !originalCondition;

  return (
    <Text className="text-ui-fg-muted" size="xsmall">
      {prefix}{" "}
      {attrChanged ? (
        <>
          <span className="text-ui-fg-disabled line-through">
            {originalCondition.attributeKey || "attribute"}
          </span>
          <RiArrowRightLine className="mx-1 inline size-3 text-ui-fg-disabled" />
          <span className="font-medium text-ui-fg-subtle">
            {condition.attributeKey || "attribute"}
          </span>
        </>
      ) : (
        <span className="font-medium text-ui-fg-subtle">
          {condition.attributeKey || "attribute"}
        </span>
      )}{" "}
      {opChanged ? (
        <>
          <span className="text-ui-fg-disabled line-through">
            {formatOperator(originalCondition.operator)}
          </span>
          <RiArrowRightLine className="mx-1 inline size-3 text-ui-fg-disabled" />
          <span className="font-medium text-ui-fg-subtle">
            {formatOperator(condition.operator)}
          </span>
        </>
      ) : (
        <span>{formatOperator(condition.operator)}</span>
      )}{" "}
      {valueChanged ? (
        <>
          <span className="text-ui-fg-disabled line-through">
            {String(originalCondition.value) || "value"}
          </span>
          <RiArrowRightLine className="mx-1 inline size-3 text-ui-fg-disabled" />
          <span className="font-medium text-ui-fg-subtle">
            {String(condition.value) || "value"}
          </span>
        </>
      ) : (
        <span className="font-medium text-ui-fg-subtle">
          {String(condition.value) || "value"}
        </span>
      )}
      {isNew && (
        <Badge className="ml-1" size="sm" variant="success">
          new
        </Badge>
      )}
    </Text>
  );
}

function TargetSummary({
  target,
  originalTarget,
  variationsById,
  segmentsById,
}: {
  target: LocalTarget;
  originalTarget?: LocalTarget;
  variationsById: Map<string, { name: string }>;
  segmentsById: Map<string, { name: string }>;
}) {
  const _variation = target.variationId
    ? variationsById.get(target.variationId)
    : undefined;
  const _originalVariation = originalTarget?.variationId;
  const variation = target.variationId
    ? variationsById.get(target.variationId)
    : undefined;
  const originalVariation = originalTarget?.variationId
    ? variationsById.get(originalTarget.variationId)
    : undefined;

  const variationChanged =
    originalTarget && originalTarget.variationId !== target.variationId;

  const conditions = target.conditions ?? [];
  const originalConditions = originalTarget?.conditions ?? [];

  const removedConditions = originalConditions.slice(conditions.length);

  const attrKeyChanged =
    originalTarget &&
    target.type === "individual" &&
    originalTarget.attributeKey !== target.attributeKey;
  const attrValueChanged =
    originalTarget &&
    target.type === "individual" &&
    originalTarget.attributeValue !== target.attributeValue;

  const segmentChanged =
    originalTarget &&
    target.type === "segment" &&
    originalTarget.segmentId !== target.segmentId;
  const segment = target.segmentId
    ? segmentsById.get(target.segmentId)
    : undefined;
  const originalSegment =
    originalTarget?.segmentId && segmentChanged
      ? segmentsById.get(originalTarget.segmentId)
      : undefined;

  return (
    <div className="flex flex-col gap-0.5">
      {target.type === "rule" && (
        <>
          {conditions.map((condition, index) => (
            <ConditionDisplay
              condition={condition}
              index={index}
              key={index}
              originalCondition={originalConditions[index]}
            />
          ))}
          {removedConditions.map((condition, index) => (
            <Text
              className="text-ui-fg-disabled line-through"
              key={`removed-${index}`}
              size="xsmall"
            >
              {index + conditions.length === 0 ? "If" : "and"}{" "}
              {condition.attributeKey} {formatOperator(condition.operator)}{" "}
              {String(condition.value)}
              <Badge className="ml-1" size="sm" variant="error">
                removed
              </Badge>
            </Text>
          ))}
        </>
      )}

      {target.type === "individual" && (
        <Text className="text-ui-fg-muted" size="xsmall">
          Where{" "}
          {attrKeyChanged ? (
            <>
              <span className="text-ui-fg-disabled line-through">
                {originalTarget?.attributeKey || "attribute"}
              </span>
              <RiArrowRightLine className="mx-1 inline size-3 text-ui-fg-disabled" />
              <span className="font-medium text-ui-fg-subtle">
                {target.attributeKey || "attribute"}
              </span>
            </>
          ) : (
            <span className="font-medium text-ui-fg-subtle">
              {target.attributeKey || "attribute"}
            </span>
          )}{" "}
          is{" "}
          {attrValueChanged ? (
            <>
              <span className="text-ui-fg-disabled line-through">
                {originalTarget?.attributeValue || "value"}
              </span>
              <RiArrowRightLine className="mx-1 inline size-3 text-ui-fg-disabled" />
              <span className="font-medium text-ui-fg-subtle">
                {target.attributeValue || "value"}
              </span>
            </>
          ) : (
            <span className="font-medium text-ui-fg-subtle">
              {target.attributeValue || "value"}
            </span>
          )}
        </Text>
      )}

      {target.type === "segment" && (
        <Text className="text-ui-fg-muted" size="xsmall">
          Users in segment{" "}
          {segmentChanged ? (
            <>
              <span className="text-ui-fg-disabled line-through">
                {originalSegment?.name || "segment"}
              </span>
              <RiArrowRightLine className="mx-1 inline size-3 text-ui-fg-disabled" />
              <span className="font-medium text-ui-fg-subtle">
                {segment?.name || "segment"}
              </span>
            </>
          ) : (
            <span className="font-medium text-ui-fg-subtle">
              {segment?.name || "segment"}
            </span>
          )}
        </Text>
      )}

      {target.rollout ? (
        <div className="flex flex-col gap-1">
          <Text className="text-ui-fg-muted" size="xsmall">
            Serves % rollout:
          </Text>
          <div className="flex flex-wrap gap-1">
            {target.rollout.variations.map((rv) => {
              const v = variationsById.get(rv.variationId);
              return (
                <Badge key={rv.variationId} size="sm" variant="outline">
                  {v?.name ?? "Unknown"}: {(rv.weight / 1000).toFixed(1)}%
                </Badge>
              );
            })}
          </div>
        </div>
      ) : (
        <FieldChange
          label="Serves"
          newValue={variation?.name ?? "Unknown"}
          oldValue={
            variationChanged
              ? (originalVariation?.name ?? "Unknown")
              : undefined
          }
        />
      )}
    </div>
  );
}

export function ReviewChangesModal() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const isOpen = useTargetingStore((s) => s.isReviewModalOpen);
  const closeModal = useTargetingStore((s) => s.closeReviewModal);
  const targets = useTargetingStore((s) => s.targets);
  const originalTargets = useTargetingStore((s) => s.originalTargets);
  const defaultVariationIdState = useTargetingStore(
    (s) => s.defaultVariationIdState
  );
  const originalDefaultVariationId = useTargetingStore(
    (s) => s.originalDefaultVariationId
  );
  const defaultRollout = useTargetingStore((s) => s.defaultRollout);
  const originalDefaultRollout = useTargetingStore(
    (s) => s.originalDefaultRollout
  );
  const enabled = useTargetingStore((s) => s.enabled);
  const originalEnabled = useTargetingStore((s) => s.originalEnabled);
  const offVariationId = useTargetingStore((s) => s.offVariationId);
  const originalOffVariationId = useTargetingStore(
    (s) => s.originalOffVariationId
  );
  const variationsById = useTargetingStore((s) => s.variationsById);
  const segmentsById = useTargetingStore((s) => s.segmentsById);
  const flagId = useTargetingStore((s) => s.flagId);
  const environmentSlug = useTargetingStore((s) => s.environmentSlug);
  const organizationSlug = useTargetingStore((s) => s.organizationSlug);
  const projectSlug = useTargetingStore((s) => s.projectSlug);
  const markSaved = useTargetingStore((s) => s.markSaved);

  const saveMutation = useMutation(
    trpc.featureFlags.saveTargetingRules.mutationOptions({
      onSuccess: () => {
        markSaved();
        closeModal();
        queryClient.invalidateQueries(
          trpc.featureFlags.getTargetingRules.pathFilter()
        );
        toastManager.add({
          type: "success",
          title: "Changes saved",
          description: `Your targeting rules have been saved to ${environmentSlug}`,
        });
      },
    })
  );

  const diffs = useMemo(
    () => computeDiff(originalTargets, targets),
    [originalTargets, targets]
  );

  const orderChanges = useMemo(
    () => computeOrderChanges(originalTargets, targets),
    [originalTargets, targets]
  );

  const _defaultModeChanged =
    (defaultRollout !== null) !== (originalDefaultRollout !== null);
  const defaultModeChanged =
    (defaultRollout !== null) !== (originalDefaultRollout !== null);
  const defaultVariationChanged =
    !(defaultRollout || originalDefaultRollout) &&
    defaultVariationIdState !== originalDefaultVariationId;
  const defaultRolloutChanged =
    defaultRollout !== null &&
    originalDefaultRollout !== null &&
    JSON.stringify(defaultRollout) !== JSON.stringify(originalDefaultRollout);
  const defaultChanged =
    defaultModeChanged || defaultVariationChanged || defaultRolloutChanged;

  const enabledChanged = enabled !== originalEnabled;
  const offVariationChanged = offVariationId !== originalOffVariationId;

  const originalVariation = variationsById.get(originalDefaultVariationId);
  const newVariation = variationsById.get(defaultVariationIdState);

  const hasAnyChanges =
    diffs.length > 0 ||
    defaultChanged ||
    orderChanges.length > 0 ||
    enabledChanged ||
    offVariationChanged;

  const diffCounts = useMemo(() => {
    const counts = { added: 0, removed: 0, modified: 0 };
    for (const diff of diffs) {
      counts[diff.type]++;
    }
    return counts;
  }, [diffs]);

  const totalChanges =
    diffs.length +
    (defaultChanged ? 1 : 0) +
    (orderChanges.length > 0 ? 1 : 0) +
    (enabledChanged ? 1 : 0) +
    (offVariationChanged ? 1 : 0);

  const handleSave = () => {
    saveMutation.mutate({
      flagId,
      environmentSlug,
      organizationSlug,
      projectSlug,
      targets,
      defaultVariationId: defaultRollout ? undefined : defaultVariationIdState,
      defaultRollout: defaultRollout ?? undefined,
      enabled,
      offVariationId,
    });
  };

  return (
    <Dialog onOpenChange={(open) => !open && closeModal()} open={isOpen}>
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <div className="relative -top-1 flex flex-col">
            <DialogTitle>
              <div className="flex items-center">
                <Heading className="font-medium text-[14px] text-ui-fg-base">
                  Review Changes
                </Heading>
                {hasAnyChanges && (
                  <Badge className="ml-2" variant="outline">
                    {totalChanges}
                  </Badge>
                )}
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review your targeting rule changes for{" "}
              <span className="font-medium text-foreground">
                {environmentSlug}
              </span>{" "}
              before saving.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-4 py-4">
            {hasAnyChanges ? (
              <div className="flex flex-col gap-4">
                {(enabledChanged || offVariationChanged) && (
                  <>
                    <div className="flex flex-col gap-3">
                      <Text
                        className="font-mono text-ui-fg-muted uppercase tracking-wide"
                        size="xsmall"
                      >
                        Flag Status
                      </Text>
                      <div className="flex flex-col gap-2">
                        {enabledChanged && (
                          <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
                            <div className="flex size-8 items-center justify-center rounded-full bg-warning/10">
                              <RiPencilLine className="size-4 text-warning-foreground" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  originalEnabled ? "success" : "outline"
                                }
                              >
                                {originalEnabled ? "ON" : "OFF"}
                              </Badge>
                              <RiArrowRightLine className="size-4 text-ui-fg-muted" />
                              <Badge variant={enabled ? "success" : "outline"}>
                                {enabled ? "ON" : "OFF"}
                              </Badge>
                            </div>
                          </div>
                        )}
                        {offVariationChanged && (
                          <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
                            <div className="flex size-8 items-center justify-center rounded-full bg-warning/10">
                              <RiPencilLine className="size-4 text-warning-foreground" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <Text className="text-ui-fg-muted" size="xsmall">
                                Off variation
                              </Text>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {(originalOffVariationId
                                    ? variationsById.get(originalOffVariationId)
                                        ?.name
                                    : null) ?? "None"}
                                </Badge>
                                <RiArrowRightLine className="size-4 text-ui-fg-muted" />
                                <Badge variant="warning">
                                  {(offVariationId
                                    ? variationsById.get(offVariationId)?.name
                                    : null) ?? "None"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {(defaultChanged ||
                      diffs.length > 0 ||
                      orderChanges.length > 0) && <Separator />}
                  </>
                )}

                {defaultChanged && (
                  <>
                    <div className="flex flex-col gap-3">
                      <Text
                        className="font-mono text-ui-fg-muted uppercase tracking-wide"
                        size="xsmall"
                      >
                        Default {defaultRollout ? "Rollout" : "Variation"}
                      </Text>
                      <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
                        <div className="flex size-8 items-center justify-center rounded-full bg-warning/10">
                          <RiPencilLine className="size-4 text-warning-foreground" />
                        </div>
                        <div className="flex flex-1 flex-col gap-2">
                          <div className="flex items-center gap-2">
                            {originalDefaultRollout ? (
                              <Badge variant="outline">
                                % Rollout (
                                {originalDefaultRollout.variations.length}{" "}
                                variations)
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                {originalVariation?.name ?? "None"}
                              </Badge>
                            )}
                            <RiArrowRightLine className="size-4 text-ui-fg-muted" />
                            {defaultRollout ? (
                              <Badge variant="warning">
                                % Rollout ({defaultRollout.variations.length}{" "}
                                variations)
                              </Badge>
                            ) : (
                              <Badge variant="warning">
                                {newVariation?.name ?? "None"}
                              </Badge>
                            )}
                          </div>
                          {defaultRollout && (
                            <div className="flex flex-wrap gap-1 text-ui-fg-muted text-xs">
                              {defaultRollout.variations.map((rv) => {
                                const variation = variationsById.get(
                                  rv.variationId
                                );
                                return (
                                  <Badge
                                    key={rv.variationId}
                                    size="sm"
                                    variant="outline"
                                  >
                                    {variation?.name ?? "Unknown"}:{" "}
                                    {(rv.weight / 1000).toFixed(1)}%
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {(diffs.length > 0 || orderChanges.length > 0) && (
                      <Separator />
                    )}
                  </>
                )}

                {orderChanges.length > 0 && (
                  <>
                    <div className="flex flex-col gap-3">
                      <Text
                        className="font-mono text-ui-fg-muted uppercase tracking-wide"
                        size="xsmall"
                      >
                        Order Changed
                      </Text>
                      <div className="flex items-center gap-3 rounded-lg border border-info/30 bg-info/5 p-4">
                        <div className="flex size-8 items-center justify-center rounded-full bg-info/10">
                          <RiDragMove2Fill className="size-4 text-info-foreground" />
                        </div>
                        <div className="flex flex-1 flex-col gap-1">
                          {orderChanges.map((change) => (
                            <Text
                              className="text-ui-fg-muted"
                              key={change.id}
                              size="xsmall"
                            >
                              <span className="font-medium text-ui-fg-subtle">
                                {change.name}
                              </span>{" "}
                              moved from position{" "}
                              <Badge size="sm" variant="outline">
                                #{change.oldPosition}
                              </Badge>{" "}
                              to{" "}
                              <Badge size="sm" variant="info">
                                #{change.newPosition}
                              </Badge>
                            </Text>
                          ))}
                        </div>
                      </div>
                    </div>
                    {diffs.length > 0 && <Separator />}
                  </>
                )}

                {diffs.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <Text
                      className="font-mono text-ui-fg-muted uppercase tracking-wide"
                      size="xsmall"
                    >
                      Targeting Rules
                    </Text>
                    <div className="flex flex-col gap-2">
                      {diffs.map((diff) => (
                        <div
                          className={cn(
                            "flex items-start gap-3 rounded-lg border p-4",
                            diff.type === "added" &&
                              "border-success/30 bg-success/5",
                            diff.type === "removed" &&
                              "border-destructive/30 bg-destructive/5",
                            diff.type === "modified" &&
                              "border-warning/30 bg-warning/5"
                          )}
                          key={diff.target.id}
                        >
                          <div
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-full",
                              diff.type === "added" && "bg-success/10",
                              diff.type === "removed" && "bg-destructive/10",
                              diff.type === "modified" && "bg-warning/10"
                            )}
                          >
                            <DiffIcon type={diff.type} />
                          </div>
                          <div className="flex flex-1 flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {diff.type === "modified" &&
                              diff.originalTarget?.name !== diff.target.name ? (
                                <div className="flex items-center gap-1">
                                  <Text
                                    className="text-ui-fg-disabled line-through"
                                    size="small"
                                  >
                                    {diff.originalTarget?.name}
                                  </Text>
                                  <RiArrowRightLine className="size-3 text-ui-fg-disabled" />
                                  <Text size="small" weight="plus">
                                    {diff.target.name}
                                  </Text>
                                </div>
                              ) : (
                                <Text size="small" weight="plus">
                                  {diff.target.name}
                                </Text>
                              )}
                              <DiffBadge type={diff.type} />
                              <Badge
                                className="ml-auto"
                                size="sm"
                                variant="outline"
                              >
                                {_.upperFirst(diff.target.type)}
                              </Badge>
                            </div>
                            <TargetSummary
                              originalTarget={diff.originalTarget}
                              segmentsById={segmentsById}
                              target={diff.target}
                              variationsById={variationsById}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />
                <Card className="flex items-center justify-between rounded-lg bg-ui-bg-subtle p-4">
                  <Text size="small" weight="plus">
                    Summary
                  </Text>
                  <div className="flex items-center gap-2">
                    {diffCounts.added > 0 && (
                      <Badge variant="success">{diffCounts.added} added</Badge>
                    )}
                    {diffCounts.modified > 0 && (
                      <Badge variant="warning">
                        {diffCounts.modified} modified
                      </Badge>
                    )}
                    {diffCounts.removed > 0 && (
                      <Badge variant="error">
                        {diffCounts.removed} removed
                      </Badge>
                    )}
                    {defaultChanged && (
                      <Badge variant="outline">Default changed</Badge>
                    )}
                    {enabledChanged && (
                      <Badge variant={enabled ? "success" : "outline"}>
                        Turned {enabled ? "ON" : "OFF"}
                      </Badge>
                    )}
                    {offVariationChanged && (
                      <Badge variant="warning">Off variation changed</Badge>
                    )}
                    {orderChanges.length > 0 && (
                      <Badge variant="info">Order changed</Badge>
                    )}
                  </div>
                </Card>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-ui-bg-subtle p-8">
                <Text className="text-ui-fg-muted" size="small">
                  No changes to review
                </Text>
              </div>
            )}
          </div>
        </DialogPanel>
        <DialogFooter>
          <Button onClick={closeModal} variant="secondary">
            Cancel
          </Button>
          <LoadingButton
            disabled={!hasAnyChanges || saveMutation.isPending}
            loading={saveMutation.isPending}
            onClick={handleSave}
            variant="gradual"
          >
            Save to {environmentSlug}
          </LoadingButton>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
