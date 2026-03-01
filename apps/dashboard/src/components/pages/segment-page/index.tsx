import type { RouterOutputs } from "@gradual/api";
import { cn } from "@gradual/ui";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import CopyButton from "@gradual/ui/copy-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import { Input } from "@gradual/ui/input";
import { Separator } from "@gradual/ui/separator";
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import {
  RiAddFill,
  RiArrowGoBackFill,
  RiCalendarFill,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiFlagLine,
  RiKey2Fill,
  RiLink,
  RiMoreFill,
  RiRulerLine,
  RiTimeFill,
  RiUserAddLine,
  type RiUserLine,
  RiUserMinusLine,
} from "@remixicon/react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import dayjs from "dayjs";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DeleteSegmentDialog from "@/components/common/dialogs/delete-segment-dialog";
import EditableDescription from "@/components/common/editable-description";
import EditableTitle from "@/components/common/editable-title";
import { AttributeSelect } from "@/components/pages/flag-page/main-flag-view/tab-content/targeting/attribute-select";
import { ContextSelect } from "@/components/pages/flag-page/main-flag-view/tab-content/targeting/context-select";
import { RuleConditionBuilder } from "@/components/pages/flag-page/main-flag-view/tab-content/targeting/rule-condition-builder";
import {
  TargetingStoreProvider,
  useTargetingStore,
} from "@/components/pages/flag-page/main-flag-view/tab-content/targeting/targeting-store";
import type {
  ContextKind,
  RuleCondition,
} from "@/components/pages/flag-page/main-flag-view/tab-content/targeting/types";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useTRPC } from "@/lib/trpc";

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

type Segment = RouterOutputs["segments"]["getByKey"];

interface IndividualEntry {
  contextKind: string;
  attributeKey: string;
  attributeValue: string;
}

function getSegmentValidationErrors(
  conditions: RuleCondition[],
  includedIndividuals: IndividualEntry[],
  excludedIndividuals: IndividualEntry[]
): string[] {
  const errors: string[] = [];

  for (const entry of [...includedIndividuals, ...excludedIndividuals]) {
    if (!entry.attributeKey?.trim()) {
      errors.push("All individuals must have an attribute selected");
      break;
    }
    if (!entry.attributeValue?.trim()) {
      errors.push("All individual values must be filled in");
      break;
    }
  }

  for (const condition of conditions) {
    if (!condition.attributeKey?.trim()) {
      errors.push("All conditions must have an attribute selected");
      break;
    }
    if (
      condition.operator !== "exists" &&
      condition.operator !== "not_exists"
    ) {
      const val = condition.value;
      if (val === undefined || val === null || String(val).trim() === "") {
        errors.push("All condition values must be filled in");
        break;
      }
    }
  }

  return errors;
}

export default function SegmentPageComponent() {
  const params = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/segments/$segmentSlug/",
  });

  return (
    <div className="h-full">
      <Suspense fallback={<SegmentPageSkeleton />}>
        <SegmentPageContent
          organizationSlug={params.organizationSlug}
          projectSlug={params.projectSlug}
          segmentSlug={params.segmentSlug}
        />
      </Suspense>
    </div>
  );
}

function SegmentPageContent({
  organizationSlug,
  projectSlug,
  segmentSlug,
}: {
  organizationSlug: string;
  projectSlug: string;
  segmentSlug: string;
}) {
  const trpc = useTRPC();
  const { canUpdateSegments } = usePermissions();

  const { data: segment } = useSuspenseQuery(
    trpc.segments.getByKey.queryOptions({
      projectSlug,
      organizationSlug,
      key: segmentSlug,
    })
  );

  const readOnly = !canUpdateSegments;

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col overflow-y-auto">
        <TargetingStoreProvider>
          <SegmentConditionsEditor
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            readOnly={readOnly}
            segment={segment}
          />
        </TargetingStoreProvider>
      </div>
      <SegmentSidebar
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        readOnly={readOnly}
        segment={segment}
      />
    </div>
  );
}

function SegmentConditionsEditor({
  segment,
  organizationSlug,
  projectSlug,
  readOnly,
}: {
  segment: Segment;
  organizationSlug: string;
  projectSlug: string;
  readOnly: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: attributes = [], isLoading: isLoadingAttributes } = useQuery(
    trpc.attributes.list.queryOptions({
      projectSlug,
      organizationSlug,
    })
  );

  const { data: contexts = [], isLoading: isLoadingContexts } = useQuery(
    trpc.attributes.listContexts.queryOptions({
      projectSlug,
      organizationSlug,
    })
  );

  const isStoreLoading = isLoadingAttributes || isLoadingContexts;

  const initialize = useTargetingStore((s) => s.initialize);

  useEffect(() => {
    initialize({
      attributes,
      contexts,
      segments: [],
      variations: [],
      organizationSlug,
      projectSlug,
      defaultVariationId: "",
      flagId: "",
      environmentSlug: "",
    });
  }, [initialize, attributes, contexts, organizationSlug, projectSlug]);

  const initialConditions = useRef(
    (segment.conditions as RuleCondition[] | null) ?? []
  );
  const initialIncluded = useRef<IndividualEntry[]>(
    (segment.includedIndividuals as IndividualEntry[] | null) ?? []
  );
  const initialExcluded = useRef<IndividualEntry[]>(
    (segment.excludedIndividuals as IndividualEntry[] | null) ?? []
  );

  const [conditions, setConditions] = useState<RuleCondition[]>(
    () => initialConditions.current
  );
  const [includedIndividuals, setIncludedIndividuals] = useState<
    IndividualEntry[]
  >(() => initialIncluded.current);
  const [excludedIndividuals, setExcludedIndividuals] = useState<
    IndividualEntry[]
  >(() => initialExcluded.current);
  const [hasChanges, setHasChanges] = useState(false);

  const validationErrors = useMemo(
    () =>
      getSegmentValidationErrors(
        conditions,
        includedIndividuals,
        excludedIndividuals
      ),
    [conditions, includedIndividuals, excludedIndividuals]
  );
  const hasValidationErrors = validationErrors.length > 0;

  const handleConditionsChange = useCallback(
    (newConditions: RuleCondition[]) => {
      setConditions(newConditions);
      setHasChanges(true);
    },
    []
  );

  const handleIncludedChange = useCallback((entries: IndividualEntry[]) => {
    setIncludedIndividuals(entries);
    setHasChanges(true);
  }, []);

  const handleExcludedChange = useCallback((entries: IndividualEntry[]) => {
    setExcludedIndividuals(entries);
    setHasChanges(true);
  }, []);

  const handleReset = useCallback(() => {
    setConditions(initialConditions.current);
    setIncludedIndividuals(initialIncluded.current);
    setExcludedIndividuals(initialExcluded.current);
    setHasChanges(false);
  }, []);

  const updateMutation = useMutation(
    trpc.segments.update.mutationOptions({
      onMutate: (variables) => {
        const snapshot = {
          conditions: initialConditions.current,
          included: initialIncluded.current,
          excluded: initialExcluded.current,
        };
        initialConditions.current =
          (variables.conditions as RuleCondition[] | undefined) ??
          initialConditions.current;
        initialIncluded.current =
          (variables.includedIndividuals as IndividualEntry[] | undefined) ??
          initialIncluded.current;
        initialExcluded.current =
          (variables.excludedIndividuals as IndividualEntry[] | undefined) ??
          initialExcluded.current;
        setHasChanges(false);
        toastManager.add({
          type: "success",
          title: "Segment saved",
        });
        return { snapshot };
      },
      onError: (error, _variables, context) => {
        if (context?.snapshot) {
          initialConditions.current = context.snapshot.conditions;
          initialIncluded.current = context.snapshot.included;
          initialExcluded.current = context.snapshot.excluded;
        }
        setHasChanges(true);
        toastManager.add({
          type: "error",
          title: "Failed to update conditions",
          description: error.message,
        });
      },
      onSettled: async () => {
        await queryClient.invalidateQueries(
          trpc.segments.getByKey.pathFilter()
        );
      },
    })
  );

  const handleSave = useCallback(() => {
    updateMutation.mutate({
      segmentId: segment.id,
      projectSlug,
      organizationSlug,
      conditions,
      includedIndividuals,
      excludedIndividuals,
    });
  }, [
    updateMutation,
    segment.id,
    projectSlug,
    organizationSlug,
    conditions,
    includedIndividuals,
    excludedIndividuals,
  ]);

  return (
    <div className="flex w-full flex-1 flex-col pt-2.5">
      <div className="mb-3 flex flex-col gap-2 px-2.5 sm:flex-row sm:items-center sm:justify-between">
        <Text weight="plus">Segment conditions</Text>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Button
              className="size-6"
              disabled={!hasChanges}
              onClick={handleReset}
              size="small"
              variant="outline"
            >
              <RiArrowGoBackFill className="size-4 shrink-0" />
            </Button>
            <Button
              disabled={!hasChanges || hasValidationErrors}
              onClick={handleSave}
              size="small"
              variant="gradual"
            >
              Save changes
            </Button>
          </div>
        )}
      </div>

      <div className="flex h-full w-full flex-1 flex-col border-t bg-ui-bg-base">
        <div className="relative flex h-full min-h-[calc(100vh-10rem)] w-full flex-col items-center justify-start overflow-hidden bg-white dark:bg-ui-bg-base">
          <div className="relative z-20 flex h-full w-full flex-col items-center px-2 sm:px-0">
            <SegmentTargetingChain
              conditions={conditions}
              excludedIndividuals={excludedIndividuals}
              includedIndividuals={includedIndividuals}
              isLoading={isStoreLoading}
              onConditionsChange={handleConditionsChange}
              onExcludedChange={handleExcludedChange}
              onIncludedChange={handleIncludedChange}
              organizationSlug={organizationSlug}
              projectSlug={projectSlug}
              readOnly={readOnly}
            />
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
  );
}

type SegmentEntryType = "exclude" | "include" | "condition";

const SEGMENT_ENTRY_OPTIONS: {
  type: SegmentEntryType;
  label: string;
  icon: typeof RiUserLine;
}[] = [
  { type: "exclude", label: "Exclude Individual", icon: RiUserMinusLine },
  { type: "include", label: "Include Individual", icon: RiUserAddLine },
  { type: "condition", label: "Condition Rule", icon: RiRulerLine },
];

function AddSegmentEntryButton({
  onAdd,
  disabled = false,
}: {
  onAdd: (type: SegmentEntryType) => void;
  disabled?: boolean;
}) {
  if (disabled) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button className="size-6 bg-ui-bg-base" variant="default" />}
      >
        <RiAddFill className="size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {SEGMENT_ENTRY_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.type}
            onClick={() => onAdd(option.type)}
          >
            <option.icon className="mr-2 size-4" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SegmentChainConnector() {
  return (
    <Separator
      className="h-6 border-[0.5px] border-ui-fg-muted/75"
      orientation="vertical"
    />
  );
}

interface ChainItem {
  type: SegmentEntryType;
  index: number;
}

function SegmentTargetingChain({
  excludedIndividuals,
  includedIndividuals,
  conditions,
  isLoading,
  onExcludedChange,
  onIncludedChange,
  onConditionsChange,
  organizationSlug,
  projectSlug,
  readOnly = false,
}: {
  excludedIndividuals: IndividualEntry[];
  includedIndividuals: IndividualEntry[];
  conditions: RuleCondition[];
  isLoading: boolean;
  onExcludedChange: (entries: IndividualEntry[]) => void;
  onIncludedChange: (entries: IndividualEntry[]) => void;
  onConditionsChange: (conditions: RuleCondition[]) => void;
  organizationSlug: string;
  projectSlug: string;
  readOnly?: boolean;
}) {
  const chainItems: ChainItem[] = [
    ...excludedIndividuals.map((_, i) => ({
      type: "exclude" as const,
      index: i,
    })),
    ...includedIndividuals.map((_, i) => ({
      type: "include" as const,
      index: i,
    })),
    ...(conditions.length > 0
      ? [{ type: "condition" as const, index: 0 }]
      : []),
  ];

  const handleAdd = (type: SegmentEntryType) => {
    if (type === "exclude") {
      onExcludedChange([
        ...excludedIndividuals,
        { contextKind: "user", attributeKey: "", attributeValue: "" },
      ]);
    } else if (type === "include") {
      onIncludedChange([
        ...includedIndividuals,
        { contextKind: "user", attributeKey: "", attributeValue: "" },
      ]);
    } else {
      onConditionsChange([
        ...conditions,
        {
          contextKind: "user",
          attributeKey: "",
          operator: "equals",
          value: "",
        },
      ]);
    }
  };

  const handleDeleteExcluded = (index: number) => {
    onExcludedChange(excludedIndividuals.filter((_, i) => i !== index));
  };

  const handleDeleteIncluded = (index: number) => {
    onIncludedChange(includedIndividuals.filter((_, i) => i !== index));
  };

  const handleUpdateExcluded = (
    index: number,
    updated: Partial<IndividualEntry>
  ) => {
    onExcludedChange(
      excludedIndividuals.map((e, i) =>
        i === index ? { ...e, ...updated } : e
      )
    );
  };

  const handleUpdateIncluded = (
    index: number,
    updated: Partial<IndividualEntry>
  ) => {
    onIncludedChange(
      includedIndividuals.map((e, i) =>
        i === index ? { ...e, ...updated } : e
      )
    );
  };

  return (
    <div className="flex w-full flex-col items-center py-3 sm:py-5">
      <AddSegmentEntryButton disabled={readOnly} onAdd={handleAdd} />
      <SegmentChainConnector />

      {chainItems.map((item, chainIndex) => {
        const excludeEntry = excludedIndividuals[item.index];
        const includeEntry = includedIndividuals[item.index];

        return (
          <div
            className="flex w-full flex-col items-center"
            key={`${item.type}-${item.index}`}
          >
            <div
              className={cn(
                "flex w-full justify-center",
                readOnly && "pointer-events-none"
              )}
            >
              {item.type === "exclude" && excludeEntry && (
                <IndividualEntryCard
                  entry={excludeEntry}
                  isLoading={isLoading}
                  label="Exclude"
                  onDelete={() => handleDeleteExcluded(item.index)}
                  onUpdate={(updated) =>
                    handleUpdateExcluded(item.index, updated)
                  }
                  organizationSlug={organizationSlug}
                  projectSlug={projectSlug}
                  readOnly={readOnly}
                />
              )}
              {item.type === "include" && includeEntry && (
                <IndividualEntryCard
                  entry={includeEntry}
                  isLoading={isLoading}
                  label="Include"
                  onDelete={() => handleDeleteIncluded(item.index)}
                  onUpdate={(updated) =>
                    handleUpdateIncluded(item.index, updated)
                  }
                  organizationSlug={organizationSlug}
                  projectSlug={projectSlug}
                  readOnly={readOnly}
                />
              )}
              {item.type === "condition" && (
                <ConditionEntryCard
                  conditions={conditions}
                  isLoading={isLoading}
                  onChange={onConditionsChange}
                  onDelete={() => onConditionsChange([])}
                  organizationSlug={organizationSlug}
                  projectSlug={projectSlug}
                  readOnly={readOnly}
                />
              )}
            </div>
            <SegmentChainConnector />
            {chainIndex < chainItems.length - 1 ? null : (
              <AddSegmentEntryButton disabled={readOnly} onAdd={handleAdd} />
            )}
            {chainIndex < chainItems.length - 1 && (
              <>
                <AddSegmentEntryButton disabled={readOnly} onAdd={handleAdd} />
                <SegmentChainConnector />
              </>
            )}
          </div>
        );
      })}

      {chainItems.length === 0 && (
        <Card className="flex w-full max-w-2xl flex-col items-center justify-center p-8">
          <Text className="text-ui-fg-muted" size="small" weight="plus">
            No rules defined for this segment.
          </Text>
          <Text className="text-ui-fg-muted" size="xsmall">
            Add conditions, include, or exclude individuals using the + button
            above.
          </Text>
        </Card>
      )}
    </div>
  );
}

function IndividualEntryCard({
  entry,
  isLoading,
  label,
  onUpdate,
  onDelete,
  organizationSlug,
  projectSlug,
  readOnly = false,
}: {
  entry: IndividualEntry;
  isLoading: boolean;
  label: string;
  onUpdate: (updated: Partial<IndividualEntry>) => void;
  onDelete: () => void;
  organizationSlug: string;
  projectSlug: string;
  readOnly?: boolean;
}) {
  return (
    <div className="group/entry relative flex w-full max-w-2xl flex-col">
      <Text
        className="absolute bottom-full left-0.5 mb-0.5 bg-ui-bg-base font-mono text-ui-fg-subtle uppercase"
        size="xsmall"
      >
        {label} individual
      </Text>
      <Card className="flex w-full flex-col p-0">
        <div className="flex flex-col gap-2.5 p-2.5 sm:p-3">
          {isLoading ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-7 w-32 rounded-sm" />
                <Skeleton className="h-7 w-36 rounded-sm" />
              </div>
              <div className="flex flex-1 items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-7 flex-1 rounded-sm" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Text className="shrink-0 text-ui-fg-muted" size="small">
                  Where
                </Text>
                <ContextSelect
                  onChange={(kind: ContextKind) =>
                    onUpdate({ contextKind: kind, attributeKey: "" })
                  }
                  value={entry.contextKind as ContextKind | undefined}
                />
                <AttributeSelect
                  contextKind={entry.contextKind as ContextKind | undefined}
                  onChange={(key: string) => onUpdate({ attributeKey: key })}
                  organizationSlug={organizationSlug}
                  projectSlug={projectSlug}
                  value={entry.attributeKey}
                />
              </div>
              <div className="flex flex-1 items-center gap-2">
                <Text className="shrink-0 text-ui-fg-muted" size="small">
                  is
                </Text>
                <Input
                  className="h-7 flex-1"
                  onChange={(e) => onUpdate({ attributeValue: e.target.value })}
                  placeholder="Enter value"
                  value={entry.attributeValue}
                />
              </div>
            </div>
          )}
        </div>
      </Card>
      {!readOnly && (
        <div className="absolute top-1/2 right-0 hidden translate-x-full -translate-y-1/2 pl-2 opacity-0 transition-opacity group-hover/entry:opacity-100 sm:flex">
          <Button
            className="size-6"
            onClick={onDelete}
            size="small"
            variant="default"
          >
            <RiDeleteBinLine className="size-3.5 shrink-0 text-ui-fg-error" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ConditionEntryCard({
  conditions,
  isLoading,
  onChange,
  onDelete,
  organizationSlug,
  projectSlug,
  readOnly = false,
}: {
  conditions: RuleCondition[];
  isLoading: boolean;
  onChange: (conditions: RuleCondition[]) => void;
  onDelete: () => void;
  organizationSlug: string;
  projectSlug: string;
  readOnly?: boolean;
}) {
  const handleChange = (updated: RuleCondition[]) => {
    if (updated.length === 0) {
      onDelete();
      return;
    }
    onChange(updated);
  };

  return (
    <div className="group/entry relative flex w-full max-w-2xl flex-col">
      <Text
        className="absolute bottom-full left-0.5 mb-0.5 font-mono text-ui-fg-subtle uppercase"
        size="xsmall"
      >
        Condition rules
      </Text>
      <Card className="flex w-full flex-col p-0">
        <div className="flex flex-col gap-2.5 p-2.5 sm:p-3">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-32 rounded-sm" />
              <Skeleton className="h-7 w-36 rounded-sm" />
              <Skeleton className="h-7 w-28 rounded-sm" />
              <Skeleton className="h-7 flex-1 rounded-sm" />
            </div>
          ) : (
            <RuleConditionBuilder
              conditions={conditions}
              onChange={handleChange}
              organizationSlug={organizationSlug}
              projectSlug={projectSlug}
            />
          )}
        </div>
      </Card>
      {!readOnly && (
        <div className="absolute top-1/2 right-0 hidden translate-x-full -translate-y-1/2 pl-2 opacity-0 transition-opacity group-hover/entry:opacity-100 sm:flex">
          <Button
            className="size-6"
            onClick={onDelete}
            size="small"
            variant="default"
          >
            <RiDeleteBinLine className="size-3.5 shrink-0 text-ui-fg-error" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface SegmentSidebarProps {
  segment: Segment;
  organizationSlug: string;
  projectSlug: string;
  readOnly: boolean;
}

function SegmentSidebar({
  segment,
  organizationSlug,
  projectSlug,
  readOnly,
}: SegmentSidebarProps) {
  const [optimisticName, setOptimisticName] = useState<string | undefined>(
    undefined
  );
  const [optimisticDescription, setOptimisticDescription] = useState<
    string | null | undefined
  >(undefined);
  const [savingField, setSavingField] = useState<"name" | "description" | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const navigate = useNavigate();
  const trpc = useTRPC();
  const { canDeleteSegments } = usePermissions();
  const queryClient = useQueryClient();

  const updateMutation = useMutation(
    trpc.segments.update.mutationOptions({
      onMutate: (variables) => {
        if (variables.name !== undefined) {
          setOptimisticName(variables.name);
          setSavingField("name");
        }
        if (variables.description !== undefined) {
          setOptimisticDescription(variables.description);
          setSavingField("description");
        }
      },
      onError: (error) => {
        setOptimisticName(undefined);
        setOptimisticDescription(undefined);
        setSavingField(null);
        toastManager.add({
          type: "error",
          title: "Failed to update segment",
          description: error.message,
        });
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.segments.getByKey.pathFilter()
        );
        await queryClient.invalidateQueries(
          trpc.project.getBreadcrumbs.pathFilter()
        );
        setOptimisticName(undefined);
        setOptimisticDescription(undefined);
        setSavingField(null);
      },
    })
  );

  const displayName =
    optimisticName !== undefined ? optimisticName : segment.name;
  const displayDescription =
    optimisticDescription !== undefined
      ? optimisticDescription
      : segment.description;

  const handleNameUpdate = (newName: string) => {
    if (newName && newName !== segment.name) {
      updateMutation.mutate({
        segmentId: segment.id,
        projectSlug,
        organizationSlug,
        name: newName,
      });
    }
  };

  const handleDescriptionUpdate = (newDescription: string | null) => {
    if (newDescription !== segment.description) {
      updateMutation.mutate({
        segmentId: segment.id,
        projectSlug,
        organizationSlug,
        description: newDescription,
      });
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(segment.key);
    toastManager.add({
      title: "Segment key copied",
      type: "success",
    });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/${organizationSlug}/${projectSlug}/segments/${segment.key}`;
    navigator.clipboard.writeText(url);
    toastManager.add({
      title: "Link copied",
      type: "success",
    });
  };

  return (
    <div className="flex h-full w-64 min-w-64 flex-col border-l bg-ui-bg-subtle">
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <EditableTitle
            loading={savingField === "name"}
            readOnly={readOnly}
            title={displayName}
            updateCallback={handleNameUpdate}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button className="size-6 shrink-0" variant="outline" />}
            >
              <RiMoreFill className="size-4 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyKey}>
                <RiFileCopyLine />
                Copy key
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                <RiLink />
                Copy link
              </DropdownMenuItem>
              {canDeleteSegments && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-ui-fg-error [&_svg]:text-ui-fg-error"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <RiDeleteBinLine />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DeleteSegmentDialog
            onDeleted={() => {
              navigate({
                to: "/$organizationSlug/$projectSlug/segments",
                params: { organizationSlug, projectSlug },
              });
            }}
            onOpenChange={setDeleteDialogOpen}
            open={deleteDialogOpen}
            segment={segment}
          />
        </div>
        <EditableDescription
          description={displayDescription}
          readOnly={readOnly}
          updateCallback={handleDescriptionUpdate}
        />
      </div>

      <Separator />

      <div className="group flex flex-col gap-1 p-4">
        <Text className="text-ui-fg-muted" size="xsmall" weight="plus">
          Key
        </Text>
        <div className="flex items-center gap-1">
          <RiKey2Fill className="size-4 text-ui-fg-muted" />
          <Text className="font-mono text-xs">{segment.key}</Text>
          <CopyButton
            className="size-5 opacity-0 transition-opacity group-hover:opacity-100 [&_svg]:size-3"
            text={segment.key}
          />
        </div>
      </div>

      <Separator />

      {segment.flagCount > 0 && (
        <>
          <div className="flex flex-col gap-1 p-4">
            <Text className="text-ui-fg-muted" size="xsmall" weight="plus">
              Used in
            </Text>
            <div className="flex items-center gap-1.5">
              <RiFlagLine className="size-4 text-ui-fg-muted" />
              <Text size="xsmall">
                {segment.flagCount} {segment.flagCount === 1 ? "flag" : "flags"}
              </Text>
            </div>
          </div>
          <Separator />
        </>
      )}

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <RiCalendarFill className="size-4 text-ui-fg-muted" />
            <Text className="text-ui-fg-muted" size="xsmall">
              Created
            </Text>
          </div>
          <Text size="xsmall" weight="plus">
            {dayjs(segment.createdAt).format("MMM DD, YYYY")}
          </Text>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <RiTimeFill className="size-4 text-ui-fg-muted" />
            <Text className="text-ui-fg-muted" size="xsmall">
              Updated
            </Text>
          </div>
          <Text size="xsmall" weight="plus">
            {dayjs(segment.updatedAt).format("MMM DD, YYYY")}
          </Text>
        </div>
      </div>
    </div>
  );
}

function SegmentPageSkeleton() {
  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between px-2.5 pt-2.5">
          <Skeleton className="h-5 w-36" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center border-t p-5">
          <Skeleton className="h-32 w-full max-w-2xl rounded-lg" />
        </div>
      </div>
      <div className="flex w-64 min-w-64 flex-col border-l bg-ui-bg-subtle">
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-5 w-full" />
        </div>
        <Separator />
        <div className="flex flex-col gap-1 p-4">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Separator />
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}
