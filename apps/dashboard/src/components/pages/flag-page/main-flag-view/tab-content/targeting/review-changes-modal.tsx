import { cn } from "@gradual/ui";
import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@gradual/ui/dialog";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { RiAddLine, RiDeleteBinLine, RiPencilLine } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTRPC } from "@/lib/trpc";
import { type LocalTarget, useTargetingStore } from "./targeting-store";

interface DiffItem {
  type: "added" | "removed" | "modified";
  target: LocalTarget;
  originalTarget?: LocalTarget;
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

function DiffIcon({ type }: { type: DiffItem["type"] }) {
  switch (type) {
    case "added":
      return <RiAddLine className="size-4 text-ui-fg-success" />;
    case "removed":
      return <RiDeleteBinLine className="size-4 text-ui-fg-error" />;
    case "modified":
      return <RiPencilLine className="size-4 text-ui-fg-warning" />;
    default:
      return null;
  }
}

function DiffBadge({ type }: { type: DiffItem["type"] }) {
  const label =
    type === "added" ? "New" : type === "removed" ? "Removed" : "Modified";
  const color =
    type === "added" ? "green" : type === "removed" ? "red" : "orange";
  return <Badge color={color}>{label}</Badge>;
}

function TargetSummary({
  target,
  variationsById,
}: {
  target: LocalTarget;
  variationsById: Map<string, { name: string }>;
}) {
  const variation = variationsById.get(target.variationId);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Text size="small" weight="plus">
          {target.name}
        </Text>
        <Badge color="grey">{target.type}</Badge>
      </div>
      <Text className="text-ui-fg-muted" size="xsmall">
        Serves: {variation?.name ?? "Unknown"}
      </Text>
      {target.type === "rule" && target.conditions?.[0] && (
        <Text className="text-ui-fg-subtle" size="xsmall">
          When {target.conditions[0].attributeKey}{" "}
          {target.conditions[0].operator} {String(target.conditions[0].value)}
        </Text>
      )}
      {target.type === "individual" && target.attributeKey && (
        <Text className="text-ui-fg-subtle" size="xsmall">
          Where {target.attributeKey} is {target.attributeValue}
        </Text>
      )}
      {target.type === "segment" && target.segmentId && (
        <Text className="text-ui-fg-subtle" size="xsmall">
          Users in segment
        </Text>
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
  const variationsById = useTargetingStore((s) => s.variationsById);
  const flagId = useTargetingStore((s) => s.flagId);
  const environmentSlug = useTargetingStore((s) => s.environmentSlug);
  const organizationSlug = useTargetingStore((s) => s.organizationSlug);
  const projectSlug = useTargetingStore((s) => s.projectSlug);
  const markSaved = useTargetingStore((s) => s.markSaved);

  const saveMutation = useMutation(
    trpc.featureFlags.saveTargetingRules.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.featureFlags.getTargetingRules.pathFilter()
        );
        markSaved();
        closeModal();
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

  const defaultVariationChanged =
    defaultVariationIdState !== originalDefaultVariationId;
  const originalVariation = variationsById.get(originalDefaultVariationId);
  const newVariation = variationsById.get(defaultVariationIdState);

  const hasAnyChanges = diffs.length > 0 || defaultVariationChanged;

  const handleSave = () => {
    saveMutation.mutate({
      flagId,
      environmentSlug,
      organizationSlug,
      projectSlug,
      targets,
      defaultVariationId: defaultVariationIdState,
    });
  };

  return (
    <Dialog onOpenChange={(open) => !open && closeModal()} open={isOpen}>
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Changes</DialogTitle>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-4 py-4">
            <Text className="text-ui-fg-subtle" size="small">
              Review your targeting rule changes before saving.
            </Text>

            {hasAnyChanges ? (
              <div className="flex flex-col gap-3">
                {defaultVariationChanged && (
                  <div className="flex flex-col gap-2 rounded-md border bg-ui-bg-subtle p-3">
                    <div className="flex items-center gap-2">
                      <RiPencilLine className="size-4 text-ui-fg-warning" />
                      <Text size="small" weight="plus">
                        Default Variation Changed
                      </Text>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-ui-fg-muted line-through">
                        {originalVariation?.name ?? "None"}
                      </span>
                      <span className="text-ui-fg-muted">→</span>
                      <span className="font-medium text-ui-fg-base">
                        {newVariation?.name ?? "None"}
                      </span>
                    </div>
                  </div>
                )}

                {diffs.map((diff) => (
                  <div
                    className={cn(
                      "flex flex-col gap-2 rounded-md border p-3",
                      diff.type === "added" &&
                        "border-ui-border-success bg-ui-bg-success-subtle",
                      diff.type === "removed" &&
                        "border-ui-border-error bg-ui-bg-error-subtle",
                      diff.type === "modified" &&
                        "border-ui-border-warning bg-ui-bg-warning-subtle"
                    )}
                    key={diff.target.id}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DiffIcon type={diff.type} />
                        <DiffBadge type={diff.type} />
                      </div>
                    </div>
                    <TargetSummary
                      target={diff.target}
                      variationsById={variationsById}
                    />
                  </div>
                ))}

                <div className="flex flex-col gap-2 rounded-md border bg-ui-bg-subtle p-3">
                  <Text size="small" weight="plus">
                    Summary
                  </Text>
                  <Text className="text-ui-fg-muted" size="small">
                    {targets.length === 0
                      ? "All targeting rules will be removed"
                      : `${targets.length} targeting rule${targets.length === 1 ? "" : "s"} will be saved`}
                  </Text>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-ui-border-base border-dashed bg-ui-bg-base p-8 text-center">
                <Text className="text-ui-fg-muted" size="small">
                  No changes to save
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
            Save Changes
          </LoadingButton>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
