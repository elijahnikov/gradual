import { getVariationColorByIndex } from "@gradual/api/utils";
import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import { Input } from "@gradual/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gradual/ui/select";
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
import { useCallback, useMemo, useState } from "react";
import {
  PercentageSlider,
  PercentInput,
  weightToPercent,
} from "./rollout-editor";
import type { LocalRollout, LocalScheduleStep } from "./targeting-store";
import type { Variation } from "./types";

const TOTAL_WEIGHT = 100_000;

interface DurationValue {
  amount: number;
  unit: "min" | "hr" | "day";
}

function minutesToDuration(minutes: number): DurationValue {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    return { amount: minutes / 1440, unit: "day" };
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    return { amount: minutes / 60, unit: "hr" };
  }
  return { amount: minutes, unit: "min" };
}

function durationToMinutes(amount: number, unit: string): number {
  switch (unit) {
    case "day":
      return amount * 1440;
    case "hr":
      return amount * 60;
    default:
      return amount;
  }
}

function DurationInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  const [localValue, setLocalValue] = useState(() => String(value));
  const [isFocused, setIsFocused] = useState(false);

  const displayValue = isFocused ? localValue : String(value);

  return (
    <Input
      className="h-7 w-16 font-mono"
      min="1"
      onBlur={() => {
        setIsFocused(false);
        const parsed = Number.parseInt(localValue, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          onChange(parsed);
        }
      }}
      onChange={(e) => {
        setLocalValue(e.target.value);
      }}
      onFocus={() => {
        setIsFocused(true);
        setLocalValue(String(value));
      }}
      type="number"
      value={displayValue}
    />
  );
}

interface GradualRolloutEditorProps {
  variations: Variation[];
  rollout: LocalRollout;
  onRolloutChange: (rollout: LocalRollout) => void;
}

export function GradualRolloutEditor({
  variations,
  rollout,
  onRolloutChange,
}: GradualRolloutEditorProps) {
  const schedule = rollout.schedule ?? [];

  const variationsById = useMemo(
    () => new Map(variations.map((v) => [v.id, v])),
    [variations]
  );

  const handleStepWeightsChange = useCallback(
    (
      stepIndex: number,
      newWeights: Array<{ variationId: string; weight: number }>
    ) => {
      const newSchedule = schedule.map((step, i) =>
        i === stepIndex ? { ...step, variations: newWeights } : step
      );
      const updated = { ...rollout, schedule: newSchedule };
      if (stepIndex === 0) {
        updated.variations = newWeights;
      }
      onRolloutChange(updated);
    },
    [schedule, rollout, onRolloutChange]
  );

  const handleStepVariationWeightChange = useCallback(
    (stepIndex: number, variationId: string, newWeight: number) => {
      const newSchedule = schedule.map((step, i) => {
        if (i !== stepIndex) {
          return step;
        }
        return {
          ...step,
          variations: step.variations.map((rv) =>
            rv.variationId === variationId ? { ...rv, weight: newWeight } : rv
          ),
        };
      });
      const updated = { ...rollout, schedule: newSchedule };
      if (stepIndex === 0) {
        updated.variations = newSchedule[0]?.variations ?? rollout.variations;
      }
      onRolloutChange(updated);
    },
    [schedule, rollout, onRolloutChange]
  );

  const handleDurationChange = useCallback(
    (stepIndex: number, amount: number, unit: string) => {
      const minutes = durationToMinutes(amount, unit);
      const newSchedule = schedule.map((step, i) =>
        i === stepIndex ? { ...step, durationMinutes: minutes } : step
      );
      onRolloutChange({ ...rollout, schedule: newSchedule });
    },
    [schedule, rollout, onRolloutChange]
  );

  const handleAddStep = useCallback(() => {
    const lastIndex = schedule.length - 1;
    const prevStep = schedule[lastIndex - 1] ?? schedule[0];
    const newStep: LocalScheduleStep = {
      durationMinutes: 60,
      variations: prevStep
        ? prevStep.variations.map((rv) => ({ ...rv }))
        : variations.map((v) => ({
            variationId: v.id,
            weight: Math.floor(TOTAL_WEIGHT / variations.length),
          })),
    };
    const newSchedule = [
      ...schedule.slice(0, lastIndex),
      newStep,
      ...schedule.slice(lastIndex),
    ];
    onRolloutChange({ ...rollout, schedule: newSchedule });
  }, [schedule, rollout, onRolloutChange, variations]);

  const handleRemoveStep = useCallback(
    (stepIndex: number) => {
      if (schedule.length <= 2) {
        return;
      }
      const newSchedule = schedule.filter((_, i) => i !== stepIndex);
      const updated = { ...rollout, schedule: newSchedule };
      if (stepIndex === 0 && newSchedule[0]) {
        updated.variations = newSchedule[0].variations;
      }
      onRolloutChange(updated);
    },
    [schedule, rollout, onRolloutChange]
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
      {schedule.map((step, stepIndex) => {
        const isLast = stepIndex === schedule.length - 1;
        const stepLabel = isLast ? "Final" : `Step ${stepIndex + 1}`;
        const duration = minutesToDuration(step.durationMinutes);

        const sliderVariations = step.variations.map((rv, idx) => {
          const variation = variationsById.get(rv.variationId);
          return {
            variationId: rv.variationId,
            weight: rv.weight,
            name: variation?.name ?? "Unknown",
            color: variation?.color ?? getVariationColorByIndex(idx),
          };
        });

        const totalWeight = step.variations.reduce(
          (sum, rv) => sum + rv.weight,
          0
        );
        const isValid = totalWeight === TOTAL_WEIGHT;

        return (
          <div className="flex flex-col gap-2" key={stepIndex}>
            {stepIndex > 0 && <Separator />}
            <div className="flex items-center justify-between px-3 sm:px-4">
              <div className="flex items-center gap-2">
                <Badge variant={isLast ? "success" : "outline"}>
                  {stepLabel}
                </Badge>
                {!isLast && (
                  <Text className="text-ui-fg-muted" size="xsmall">
                    for
                  </Text>
                )}
                {!isLast && (
                  <div className="flex items-center gap-2">
                    <DurationInput
                      onChange={(val) =>
                        handleDurationChange(stepIndex, val, duration.unit)
                      }
                      value={duration.amount}
                    />
                    <Select
                      onValueChange={(val) => {
                        if (val) {
                          handleDurationChange(stepIndex, duration.amount, val);
                        }
                      }}
                      value={duration.unit}
                    >
                      <SelectTrigger className="min-h-7! min-w-[50px]!">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectItem value="min">min</SelectItem>
                        <SelectItem value="hr">hr</SelectItem>
                        <SelectItem value="day">day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {schedule.length > 2 && (
                <Button
                  className="h-7 w-7 min-w-7 p-0"
                  onClick={() => handleRemoveStep(stepIndex)}
                  size="small"
                  variant="ghost"
                >
                  <RiDeleteBinLine className="size-4 shrink-0 text-ui-fg-error" />
                </Button>
              )}
            </div>

            <div className="px-3 sm:px-4">
              <PercentageSlider
                onChange={(newWeights) =>
                  handleStepWeightsChange(stepIndex, newWeights)
                }
                variations={sliderVariations}
              />
            </div>

            <div className="flex flex-col gap-2">
              {step.variations.map((rv, idx) => {
                const variation = variationsById.get(rv.variationId);
                const color = variation?.color ?? getVariationColorByIndex(idx);
                return (
                  <div
                    className="flex items-center gap-2 px-3 sm:px-4"
                    key={rv.variationId}
                  >
                    <div
                      className="h-3 w-3 shrink-0 rounded-[4px]"
                      style={{ backgroundColor: color }}
                    />
                    <Text className="min-w-20 shrink-0" size="small">
                      {variation?.name ?? "Unknown"}
                    </Text>
                    <div className="flex items-center gap-2">
                      <PercentInput
                        onChange={(weight) =>
                          handleStepVariationWeightChange(
                            stepIndex,
                            rv.variationId,
                            weight
                          )
                        }
                        value={rv.weight}
                      />
                      <Text className="text-ui-fg-muted" size="small">
                        %
                      </Text>
                    </div>
                  </div>
                );
              })}
            </div>

            {!isValid && (
              <Text className="px-3 text-ui-fg-error sm:px-4" size="small">
                Weights must sum to 100% (currently{" "}
                {weightToPercent(totalWeight)}
                %)
              </Text>
            )}
          </div>
        );
      })}

      <Separator />
      <div className="flex items-center gap-2 px-3 sm:px-4">
        <Button onClick={handleAddStep} size="xsmall" variant="outline">
          <RiAddLine className="size-3" />
          Add Step
        </Button>
      </div>

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
