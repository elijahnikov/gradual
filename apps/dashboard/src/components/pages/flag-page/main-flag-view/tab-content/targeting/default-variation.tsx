import { Card } from "@gradual/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@gradual/ui/select";
import { Separator } from "@gradual/ui/separator";
import { Switch } from "@gradual/ui/switch";
import { Text } from "@gradual/ui/text";
import { RiPercentLine, RiTimerLine } from "@remixicon/react";
import { useCallback, useMemo } from "react";
import { GradualRolloutEditor } from "./gradual-rollout-editor";
import { RolloutEditor } from "./rollout-editor";
import type { LocalRollout } from "./targeting-store";
import { useTargetingStore } from "./targeting-store";

const ROLLOUT_VALUE = "__rollout__";
const GRADUAL_VALUE = "__gradual__";

interface DefaultVariationProps {
  disabled?: boolean;
}

export default function DefaultVariation({
  disabled = false,
}: DefaultVariationProps) {
  const variations = useTargetingStore((s) => s.variations);
  const defaultVariationIdState = useTargetingStore(
    (s) => s.defaultVariationIdState
  );
  const defaultRollout = useTargetingStore((s) => s.defaultRollout);
  const setDefaultVariation = useTargetingStore((s) => s.setDefaultVariation);
  const setDefaultRollout = useTargetingStore((s) => s.setDefaultRollout);
  const setDefaultMode = useTargetingStore((s) => s.setDefaultMode);
  const enabled = useTargetingStore((s) => s.enabled);
  const setEnabled = useTargetingStore((s) => s.setEnabled);
  const offVariationId = useTargetingStore((s) => s.offVariationId);
  const setOffVariationId = useTargetingStore((s) => s.setOffVariationId);

  const variationItems = useMemo(
    () =>
      variations.map((variation) => ({
        label: variation.name,
        value: variation.id,
        color: variation.color,
      })),
    [variations]
  );

  const isGradual = !!defaultRollout?.schedule;
  const isRollout = !!defaultRollout && !isGradual;
  const displayValue = isGradual
    ? GRADUAL_VALUE
    : isRollout
      ? ROLLOUT_VALUE
      : defaultVariationIdState;
  const selectedVariation = variationItems.find(
    (v) => v.value === defaultVariationIdState
  );

  const handleValueChange = useCallback(
    (value: string) => {
      if (value === GRADUAL_VALUE) {
        setDefaultMode("gradual");
      } else if (value === ROLLOUT_VALUE) {
        setDefaultMode("rollout");
      } else {
        setDefaultVariation(value);
      }
    },
    [setDefaultMode, setDefaultVariation]
  );

  const handleRolloutChange = useCallback(
    (rollout: LocalRollout) => {
      setDefaultRollout(rollout);
    },
    [setDefaultRollout]
  );

  const selectedOffVariation = variationItems.find(
    (v) => v.value === offVariationId
  );

  return (
    <Card className="flex w-full max-w-3xl flex-col gap-3 p-0">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Switch
            checked={enabled}
            disabled={disabled}
            onCheckedChange={setEnabled}
          />
          <Text className="text-ui-fg-subtle" size="small">
            {enabled ? "If no rules match, serve" : "Flag is off, serve"}
          </Text>
        </div>
        {enabled ? (
          <Select
            disabled={disabled}
            onValueChange={(val) => {
              if (val) {
                handleValueChange(val);
              }
            }}
            value={displayValue}
          >
            <SelectTrigger className="min-h-7! w-full sm:w-48">
              <SelectValue>
                {isGradual ? (
                  <span className="flex items-center gap-1.5">
                    <RiTimerLine className="size-3.5" />
                    Gradual rollout
                  </span>
                ) : isRollout ? (
                  <span className="flex items-center gap-1.5">
                    <RiPercentLine className="size-3.5" />
                    Percentage rollout
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    {selectedVariation?.color && (
                      <span
                        className="size-3 shrink-0 rounded-[4px]"
                        style={{ backgroundColor: selectedVariation.color }}
                      />
                    )}
                    {selectedVariation?.label}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {variationItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  <span className="flex items-center gap-1.5">
                    {item.color && (
                      <span
                        className="size-3 shrink-0 rounded-[4px]"
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                    {item.label}
                  </span>
                </SelectItem>
              ))}
              <SelectSeparator className="-mx-2" />
              <SelectItem value={ROLLOUT_VALUE}>
                <span className="flex items-center gap-1.5">
                  <RiPercentLine className="size-3.5" />
                  Percentage rollout
                </span>
              </SelectItem>
              <SelectItem value={GRADUAL_VALUE}>
                <span className="flex items-center gap-1.5">
                  <RiTimerLine className="size-3.5" />
                  Gradual rollout
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Select
            disabled={disabled}
            onValueChange={(val) => {
              if (val) {
                setOffVariationId(val);
              }
            }}
            value={offVariationId ?? ""}
          >
            <SelectTrigger className="min-h-7! w-full sm:w-40">
              <SelectValue>
                {selectedOffVariation ? (
                  <span className="flex items-center gap-1.5">
                    {selectedOffVariation.color && (
                      <span
                        className="size-3 shrink-0 rounded-[4px]"
                        style={{
                          backgroundColor: selectedOffVariation.color,
                        }}
                      />
                    )}
                    {selectedOffVariation.label}
                  </span>
                ) : (
                  "Select variation"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {variationItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  <span className="flex items-center gap-1.5">
                    {item.color && (
                      <span
                        className="size-3 shrink-0 rounded-[4px]"
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                    {item.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {enabled && isGradual && defaultRollout && (
        <>
          <Separator className="-mt-2.5" />
          <GradualRolloutEditor
            onRolloutChange={handleRolloutChange}
            rollout={defaultRollout}
            variations={variations}
          />
        </>
      )}
      {enabled && isRollout && defaultRollout && (
        <>
          <Separator className="-mt-2.5" />
          <RolloutEditor
            label=""
            onRolloutChange={handleRolloutChange}
            rollout={defaultRollout}
            variations={variations}
          />
        </>
      )}
    </Card>
  );
}
