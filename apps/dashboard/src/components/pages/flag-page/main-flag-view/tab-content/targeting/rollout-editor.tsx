import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import { Input } from "@gradual/ui/input";
import { Separator } from "@gradual/ui/separator";
import { Text } from "@gradual/ui/text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import {
  RiAddLine,
  RiDeleteBinLine,
  RiInformationFill,
} from "@remixicon/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LocalRollout, LocalRolloutVariation } from "./targeting-store";
import type { Variation } from "./types";

interface RolloutEditorProps {
  variations: Variation[];
  rollout: LocalRollout;
  onRolloutChange: (rollout: LocalRollout) => void;
  label?: string;
}

const TOTAL_WEIGHT = 100_000;
const COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-orange-500",
];

function weightToPercent(weight: number): string {
  return (weight / 1000).toFixed(1);
}

function percentToWeight(percent: string): number {
  const val = Number.parseFloat(percent);
  if (Number.isNaN(val)) {
    return 0;
  }
  return Math.round(val * 1000);
}

function PercentInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (weight: number) => void;
}) {
  const [localValue, setLocalValue] = useState(() => weightToPercent(value));
  const [isFocused, setIsFocused] = useState(false);

  const displayValue = isFocused ? localValue : weightToPercent(value);

  return (
    <Input
      className="h-7 w-20"
      max="100"
      min="0"
      onBlur={() => {
        setIsFocused(false);
        onChange(percentToWeight(localValue));
      }}
      onChange={(e) => {
        setLocalValue(e.target.value);
      }}
      onFocus={() => {
        setIsFocused(true);
        setLocalValue(weightToPercent(value));
      }}
      step="0.1"
      type="number"
      value={displayValue}
    />
  );
}

interface PercentageSliderProps {
  variations: Array<{ variationId: string; weight: number; name: string }>;
  onChange: (
    newWeights: Array<{ variationId: string; weight: number }>
  ) => void;
}

function PercentageSlider({ variations, onChange }: PercentageSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const thumbPositions = useMemo(() => {
    const positions: number[] = [];
    let cumulative = 0;
    for (let i = 0; i < variations.length - 1; i++) {
      const variation = variations[i];
      if (variation) {
        cumulative += variation.weight;
        positions.push((cumulative / TOTAL_WEIGHT) * 100);
      }
    }
    return positions;
  }, [variations]);

  const updatePosition = useCallback(
    (clientX: number, thumbIndex: number) => {
      if (!trackRef.current) {
        return;
      }

      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(
        0,
        Math.min(100, ((clientX - rect.left) / rect.width) * 100)
      );

      const newPositions = [...thumbPositions];
      newPositions[thumbIndex] = percent;
      newPositions.sort((a, b) => a - b);

      const newWeights: Array<{ variationId: string; weight: number }> = [];
      let prevPosition = 0;

      for (let i = 0; i < variations.length; i++) {
        const variation = variations[i];
        if (!variation) {
          continue;
        }
        const currentPosition =
          i < newPositions.length ? (newPositions[i] ?? 100) : 100;
        const weight = Math.round(
          ((currentPosition - prevPosition) / 100) * TOTAL_WEIGHT
        );
        newWeights.push({
          variationId: variation.variationId,
          weight: Math.max(0, weight),
        });
        prevPosition = currentPosition;
      }

      onChange(newWeights);
    },
    [thumbPositions, variations, onChange]
  );

  useEffect(() => {
    if (draggingIndex === null) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      updatePosition(e.clientX, draggingIndex);
    };

    const handleMouseUp = () => {
      setDraggingIndex(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingIndex, updatePosition]);

  const segments = useMemo(() => {
    const result: Array<{
      variationId: string;
      width: number;
      color: string;
      name: string;
      percent: string;
    }> = [];
    let prevPosition = 0;

    for (let i = 0; i < variations.length; i++) {
      const variation = variations[i];
      if (!variation) {
        continue;
      }
      const currentPosition =
        i < thumbPositions.length ? (thumbPositions[i] ?? 100) : 100;
      const width = currentPosition - prevPosition;
      result.push({
        variationId: variation.variationId,
        width: Math.max(0, width),
        color: COLORS[i % COLORS.length] ?? "bg-gray-500",
        name: variation.name,
        percent: weightToPercent(variation.weight),
      });
      prevPosition = currentPosition;
    }

    return result;
  }, [variations, thumbPositions]);

  if (variations.length < 2) {
    return null;
  }

  return (
    <div className="relative h-8 w-full" ref={trackRef}>
      <div className="flex h-full w-full overflow-hidden rounded-md border border-ui-border-base">
        {segments.map((segment) => (
          <div
            className={`${segment.color} flex h-full items-center justify-center`}
            key={segment.variationId}
            style={{ width: `${segment.width}%` }}
            title={`${segment.name}: ${segment.percent}%`}
          >
            {segment.width >= 8 && (
              <Badge className="font-medium font-mono text-xs">
                {`${segment.percent}%`}
              </Badge>
            )}
          </div>
        ))}
      </div>
      {thumbPositions.map((position, index) => {
        const variation = variations[index];
        if (!variation) {
          return null;
        }
        return (
          // biome-ignore lint/a11y/noNoninteractiveElementInteractions: <>
          // biome-ignore lint/a11y/noStaticElementInteractions: <>
          <div
            className="absolute top-0 z-10 flex h-full w-4 -translate-x-1/2 cursor-ew-resize items-center justify-center"
            key={`thumb-${variation.variationId}`}
            onMouseDown={(e) => {
              e.preventDefault();
              setDraggingIndex(index);
            }}
            style={{ left: `${position}%` }}
          >
            <div className="h-5 w-1.5 rounded-full bg-white shadow-md ring-1 ring-black/10" />
          </div>
        );
      })}
    </div>
  );
}

export function RolloutEditor({
  variations,
  rollout,
  onRolloutChange,
  label = "Serve",
}: RolloutEditorProps) {
  const [_advancedOpen, _setAdvancedOpen] = useState(false);

  const variationsById = useMemo(
    () => new Map(variations.map((v) => [v.id, v])),
    [variations]
  );

  const availableVariations = useMemo(
    () =>
      variations.filter(
        (v) => !rollout.variations.some((rv) => rv.variationId === v.id)
      ),
    [variations, rollout.variations]
  );

  const totalWeight = useMemo(
    () => rollout.variations.reduce((sum, rv) => sum + rv.weight, 0),
    [rollout.variations]
  );

  const isValid = totalWeight === TOTAL_WEIGHT;

  const sliderVariations = useMemo(
    () =>
      rollout.variations.map((rv) => ({
        variationId: rv.variationId,
        weight: rv.weight,
        name: variationsById.get(rv.variationId)?.name ?? "Unknown",
      })),
    [rollout.variations, variationsById]
  );

  const handleSliderChange = useCallback(
    (newWeights: Array<{ variationId: string; weight: number }>) => {
      onRolloutChange({ ...rollout, variations: newWeights });
    },
    [rollout, onRolloutChange]
  );

  const handleWeightChange = useCallback(
    (variationId: string, newWeight: number) => {
      const newVariations = rollout.variations.map((rv) =>
        rv.variationId === variationId ? { ...rv, weight: newWeight } : rv
      );
      onRolloutChange({ ...rollout, variations: newVariations });
    },
    [rollout, onRolloutChange]
  );

  const handleRemoveVariation = useCallback(
    (variationId: string) => {
      const newVariations = rollout.variations.filter(
        (rv) => rv.variationId !== variationId
      );
      onRolloutChange({ ...rollout, variations: newVariations });
    },
    [rollout, onRolloutChange]
  );

  const handleAddVariation = useCallback(
    (variationId: string) => {
      const newVariation: LocalRolloutVariation = {
        variationId,
        weight: 0,
      };
      onRolloutChange({
        ...rollout,
        variations: [...rollout.variations, newVariation],
      });
    },
    [rollout, onRolloutChange]
  );

  const handleBucketChange = useCallback(
    (
      field: "bucketContextKind" | "bucketAttributeKey" | "seed",
      value: string
    ) => {
      onRolloutChange({ ...rollout, [field]: value });
    },
    [rollout, onRolloutChange]
  );

  return (
    <div className="flex w-full flex-col gap-3">
      {label && (
        <div className="flex items-center gap-2">
          <Text className="text-ui-fg-subtle" size="small">
            {label}
          </Text>
        </div>
      )}

      {rollout.variations.length > 1 && (
        <div className="px-3 sm:px-4">
          <PercentageSlider
            onChange={handleSliderChange}
            variations={sliderVariations}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rollout.variations.map((rv, index) => {
          const variation = variationsById.get(rv.variationId);
          const color = COLORS[index % COLORS.length];

          return (
            <>
              <div
                className="flex items-center gap-2 px-3 sm:px-4"
                key={rv.variationId}
              >
                <div className={`${color} h-3 w-3 shrink-0 rounded-full`} />
                <Text className="min-w-20 shrink-0" size="small">
                  {variation?.name ?? "Unknown"}
                </Text>
                <div className="flex items-center gap-2">
                  <PercentInput
                    onChange={(weight) =>
                      handleWeightChange(rv.variationId, weight)
                    }
                    value={rv.weight}
                  />
                  <Text className="text-ui-fg-muted" size="small">
                    %
                  </Text>
                </div>
                {rollout.variations.length > 1 && (
                  <Button
                    className="ml-auto h-7 w-7 min-w-7 p-0"
                    onClick={() => handleRemoveVariation(rv.variationId)}
                    size="small"
                    variant="ghost"
                  >
                    <RiDeleteBinLine className="size-4 shrink-0 text-ui-fg-error" />
                  </Button>
                )}
              </div>
              <Separator />
            </>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4">
        {availableVariations.length > 0 && (
          <div className="flex items-center gap-2">
            {availableVariations.map((v) => (
              <Button
                key={v.id}
                onClick={() => handleAddVariation(v.id)}
                size="xsmall"
                variant="outline"
              >
                <RiAddLine className="size-3" />
                {v.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {!isValid && rollout.variations.length > 0 && (
        <Text className="text-ui-fg-error" size="small">
          Weights must sum to 100% (currently {weightToPercent(totalWeight)}%)
        </Text>
      )}

      <Separator />
      <div className="flex items-center gap-2 px-3 pb-4 sm:px-4">
        <div className="flex flex-col gap-1">
          <Text className="text-ui-fg-subtle" size="xsmall">
            Bucket by
          </Text>
          <div className="flex w-max items-center gap-2">
            <Input
              className="h-7 w-24"
              onChange={(e) =>
                handleBucketChange("bucketContextKind", e.target.value)
              }
              placeholder="user"
              value={rollout.bucketContextKind}
            />
            <Input
              className="h-7 w-24"
              onChange={(e) =>
                handleBucketChange("bucketAttributeKey", e.target.value)
              }
              placeholder="id"
              value={rollout.bucketAttributeKey}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Text className="text-ui-fg-subtle" size="xsmall">
            Seed (optional)
          </Text>
          <div className="flex items-center gap-2">
            <Input
              className="h-7 w-48"
              onChange={(e) => handleBucketChange("seed", e.target.value)}
              placeholder="Leave empty for default"
              value={rollout.seed ?? ""}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <RiInformationFill className="size-4 text-ui-fg-muted" />
                </TooltipTrigger>
                <TooltipContent>
                  Changes user distribution. Set a custom value to re-randomize
                  which users get each variation.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}

export function createDefaultRollout(variations: Variation[]): LocalRollout {
  if (variations.length === 0) {
    return {
      variations: [],
      bucketContextKind: "user",
      bucketAttributeKey: "id",
    };
  }

  const count = Math.min(2, variations.length);
  const baseWeight = Math.floor(TOTAL_WEIGHT / count);
  const remainder = TOTAL_WEIGHT % count;

  return {
    variations: variations.slice(0, count).map((v, index) => ({
      variationId: v.id,
      weight: baseWeight + (index < remainder ? 1 : 0),
    })),
    bucketContextKind: "user",
    bucketAttributeKey: "id",
  };
}
