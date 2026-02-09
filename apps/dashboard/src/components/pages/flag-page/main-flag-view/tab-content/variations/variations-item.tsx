import type { RouterOutputs } from "@gradual/api";
import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { Input } from "@gradual/ui/input";
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import {
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinFill,
  RiDeleteBinLine,
  RiFlashlightFill,
  RiPencilFill,
} from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { JsonEditor } from "@/components/common/json-editor";
import VariationColorPicker from "@/components/common/variation-color-picker";
import { useTRPC } from "@/lib/trpc";

type FlagType = "boolean" | "string" | "number" | "json";
type Variation = RouterOutputs["featureFlags"]["getVariations"][number];

interface VariationsItemProps {
  variation: Variation;
  flagId: string;
  flagType: FlagType;
  organizationSlug: string;
  projectSlug: string;
  variationCount: number;
  readOnly?: boolean;
}

export default function VariationsItem({
  variation,
  flagId,
  flagType,
  organizationSlug,
  projectSlug,
  variationCount,
  readOnly = false,
}: VariationsItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(variation.name);
  const [editedValue, setEditedValue] = useState<unknown>(variation.value);
  const [jsonValue, setJsonValue] = useState(
    typeof variation.value === "object"
      ? JSON.stringify(variation.value, null, 2)
      : ""
  );
  const [isJsonValid, setIsJsonValid] = useState(true);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const variationsQueryKey = trpc.featureFlags.getVariations.queryOptions({
    flagId,
    projectSlug,
    organizationSlug,
  }).queryKey;

  const canEdit = flagType !== "boolean" && !readOnly;
  const canDelete =
    flagType !== "boolean" &&
    !variation.isDefault &&
    variationCount > 2 &&
    !readOnly;

  useEffect(() => {
    setEditedName(variation.name);
    setEditedValue(variation.value);
    if (typeof variation.value === "object") {
      setJsonValue(JSON.stringify(variation.value, null, 2));
    }
  }, [variation.name, variation.value]);

  const updateMutation = useMutation(
    trpc.featureFlags.updateVariation.mutationOptions({
      onMutate: async (updatedVariation) => {
        await queryClient.cancelQueries({ queryKey: variationsQueryKey });

        const previousVariations =
          queryClient.getQueryData<Variation[]>(variationsQueryKey);

        if (previousVariations) {
          queryClient.setQueryData<Variation[]>(
            variationsQueryKey,
            previousVariations.map((v) =>
              v.id === updatedVariation.variationId
                ? {
                    ...v,
                    name: updatedVariation.name ?? v.name,
                    value: updatedVariation.value ?? v.value,
                    description: updatedVariation.description ?? v.description,
                    color: updatedVariation.color ?? v.color,
                    updatedAt: new Date(),
                  }
                : v
            )
          );
        }

        setIsEditing(false);

        return { previousVariations };
      },
      onError: (error, _variables, context) => {
        if (context?.previousVariations) {
          queryClient.setQueryData(
            variationsQueryKey,
            context.previousVariations
          );
        }
        toastManager.add({
          title: "Failed to update variation",
          description: error.message,
          type: "error",
        });
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: variationsQueryKey });
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.featureFlags.deleteVariation.mutationOptions({
      onMutate: async (deletedVariation) => {
        await queryClient.cancelQueries({ queryKey: variationsQueryKey });

        const previousVariations =
          queryClient.getQueryData<Variation[]>(variationsQueryKey);

        if (previousVariations) {
          queryClient.setQueryData<Variation[]>(
            variationsQueryKey,
            previousVariations.filter(
              (v) => v.id !== deletedVariation.variationId
            )
          );
        }

        return { previousVariations };
      },
      onError: (error, _variables, context) => {
        if (context?.previousVariations) {
          queryClient.setQueryData(
            variationsQueryKey,
            context.previousVariations
          );
        }
        toastManager.add({
          title: "Failed to delete variation",
          description: error.message,
          type: "error",
        });
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: variationsQueryKey });
      },
    })
  );

  const handleDelete = useCallback(() => {
    deleteMutation.mutate({
      variationId: variation.id,
      flagId,
      projectSlug,
      organizationSlug,
    });
  }, [variation.id, flagId, projectSlug, organizationSlug, deleteMutation]);

  const handleSave = useCallback(() => {
    const updates: { name?: string; value?: unknown } = {};

    if (editedName !== variation.name) {
      updates.name = editedName;
    }

    if (flagType === "json") {
      if (!isJsonValid) {
        toastManager.add({
          title: "Invalid JSON",
          description: "Please fix the JSON before saving",
          type: "error",
        });
        return;
      }
      try {
        const parsedValue = JSON.parse(jsonValue);
        if (JSON.stringify(parsedValue) !== JSON.stringify(variation.value)) {
          updates.value = parsedValue;
        }
      } catch {
        toastManager.add({
          title: "Invalid JSON",
          description: "Please fix the JSON before saving",
          type: "error",
        });
        return;
      }
    } else if (editedValue !== variation.value) {
      updates.value = editedValue;
    }

    if (Object.keys(updates).length === 0) {
      setIsEditing(false);
      return;
    }

    updateMutation.mutate({
      variationId: variation.id,
      flagId,
      projectSlug,
      organizationSlug,
      ...updates,
    });
  }, [
    editedName,
    editedValue,
    jsonValue,
    isJsonValid,
    flagType,
    variation,
    flagId,
    projectSlug,
    organizationSlug,
    updateMutation,
  ]);

  const handleColorChange = useCallback(
    (color: string) => {
      updateMutation.mutate({
        variationId: variation.id,
        flagId,
        projectSlug,
        organizationSlug,
        color,
      });
    },
    [variation.id, flagId, projectSlug, organizationSlug, updateMutation]
  );

  const handleCancel = useCallback(() => {
    setEditedName(variation.name);
    setEditedValue(variation.value);
    if (typeof variation.value === "object") {
      setJsonValue(JSON.stringify(variation.value, null, 2));
    }
    setIsEditing(false);
  }, [variation.name, variation.value]);

  const renderValue = () => {
    if (flagType === "boolean") {
      return (
        <Badge className="font-mono" size="lg" variant="outline">
          {variation.value === true ? "true" : "false"}
        </Badge>
      );
    }

    if (isEditing) {
      if (flagType === "json") {
        return (
          <div className="w-full">
            <JsonEditor
              initialValue={jsonValue}
              maxHeight="400px"
              onChange={(value, isValid) => {
                setJsonValue(value);
                setIsJsonValid(isValid);
              }}
            />
          </div>
        );
      }

      if (flagType === "number") {
        return (
          <Input
            className="w-48"
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                setEditedValue("");
              } else {
                const num = Number(val);
                setEditedValue(Number.isNaN(num) ? "" : num);
              }
            }}
            type="number"
            value={typeof editedValue === "number" ? String(editedValue) : ""}
          />
        );
      }

      return (
        <Input
          className="w-64"
          onChange={(e) => setEditedValue(e.target.value)}
          type="text"
          value={typeof editedValue === "string" ? editedValue : ""}
        />
      );
    }

    if (flagType === "json") {
      return (
        <div className="w-full overflow-hidden rounded-md border bg-ui-bg-base p-2">
          <pre className="overflow-x-auto font-mono text-sm">
            {JSON.stringify(variation.value, null, 2)}
          </pre>
        </div>
      );
    }

    return (
      <Badge className="font-mono" size="lg" variant="outline">
        {String(variation.value)}
      </Badge>
    );
  };

  return (
    <Card className="group relative flex flex-col p-0">
      <div className="p-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <VariationColorPicker
              onChange={handleColorChange}
              value={variation.color}
            />
            {isEditing ? (
              <Input
                className="h-7 w-48"
                onChange={(e) => setEditedName(e.target.value)}
                value={editedName}
              />
            ) : flagType !== "boolean" ? (
              <Text size="base" weight="plus">
                {variation.name}
              </Text>
            ) : null}
            {variation.isDefault && (
              <Badge size="default" variant="info">
                Default
              </Badge>
            )}
          </div>

          {canEdit && (
            <div className="flex items-center gap-1">
              {isEditing ? (
                <>
                  <Button
                    className="size-6"
                    disabled={updateMutation.isPending}
                    onClick={handleCancel}
                    size="small"
                    variant="ghost"
                  >
                    <RiCloseLine className="size-4 shrink-0" />
                  </Button>
                  <Button
                    className="size-6 shrink-0"
                    disabled={updateMutation.isPending}
                    onClick={handleSave}
                    size="small"
                    variant="gradual"
                  >
                    {updateMutation.isPending ? (
                      <Skeleton className="size-4" />
                    ) : (
                      <RiCheckLine className="size-4 shrink-0" />
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => setIsEditing(true)}
                    size="small"
                    variant="outline"
                  >
                    <RiPencilFill className="size-4 shrink-0" />
                  </Button>
                  {canDelete ? (
                    <Button
                      className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
                      disabled={deleteMutation.isPending}
                      onClick={handleDelete}
                      size="small"
                      variant="outline"
                    >
                      <RiDeleteBinFill className="size-4 shrink-0 text-ui-fg-error" />
                    </Button>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
                              disabled
                              size="small"
                              variant="ghost"
                            />
                          }
                        >
                          <RiDeleteBinLine className="size-4 shrink-0 text-ui-fg-disabled" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {variation.isDefault
                            ? "Cannot delete the default variation"
                            : "Flags must have at least 2 variations"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-2 flex items-start gap-2">{renderValue()}</div>
      </div>
      <div className="flex items-center border-t px-3 pt-2.5 pb-3">
        <div className="flex items-center gap-0.5">
          <RiFlashlightFill className="size-4 text-ui-fg-muted" />
          <Text className="text-ui-fg-base" size="xsmall" weight="plus">
            {variation.evaluationCount.toLocaleString()}
            <span className="text-ui-fg-muted"> evaluations</span>
          </Text>
        </div>
      </div>
    </Card>
  );
}
