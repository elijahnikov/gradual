import { Badge } from "@gradual/ui/badge";
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
import { Text } from "@gradual/ui/text";
import { RiPercentLine } from "@remixicon/react";
import { useCallback, useMemo } from "react";
import { RolloutEditor } from "./rollout-editor";
import type { LocalRollout } from "./targeting-store";
import { useTargetingStore } from "./targeting-store";

const ROLLOUT_VALUE = "__rollout__";

export default function DefaultVariation() {
  const variations = useTargetingStore((s) => s.variations);
  const defaultVariationIdState = useTargetingStore(
    (s) => s.defaultVariationIdState
  );
  const defaultRollout = useTargetingStore((s) => s.defaultRollout);
  const setDefaultVariation = useTargetingStore((s) => s.setDefaultVariation);
  const setDefaultRollout = useTargetingStore((s) => s.setDefaultRollout);
  const setDefaultMode = useTargetingStore((s) => s.setDefaultMode);

  const variationItems = useMemo(
    () =>
      variations.map((variation) => ({
        label: variation.name,
        value: variation.id,
        color: variation.color,
      })),
    [variations]
  );

  const isRollout = !!defaultRollout;
  const displayValue = isRollout ? ROLLOUT_VALUE : defaultVariationIdState;
  const selectedVariation = variationItems.find(
    (v) => v.value === defaultVariationIdState
  );

  const handleValueChange = useCallback(
    (value: string) => {
      if (value === ROLLOUT_VALUE) {
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

  return (
    <Card className="flex w-full max-w-3xl flex-col gap-3 p-0">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Badge size="lg" variant="outline">
          Default
        </Badge>
        <div className="flex items-center gap-2">
          <Text className="text-ui-fg-subtle" size="small">
            If no rules match, serve
          </Text>
          <Select
            onValueChange={(val) => {
              if (val) {
                handleValueChange(val);
              }
            }}
            value={displayValue}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue>
                {isRollout ? (
                  <span className="flex items-center gap-1.5">
                    <RiPercentLine className="size-3.5" />
                    Rollout
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
                  Rollout
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isRollout && defaultRollout && (
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
