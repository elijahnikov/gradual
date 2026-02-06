import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@gradual/ui/select";
import { Text } from "@gradual/ui/text";
import { RiPercentLine } from "@remixicon/react";
import { useMemo } from "react";
import type { Variation } from "./types";

const ROLLOUT_VALUE = "__rollout__";

interface VariationSelectorProps {
  variations: Variation[];
  value?: string;
  isRollout?: boolean;
  onChange: (variationId: string) => void;
  onRolloutSelect: () => void;
  label?: string;
}

export function VariationSelector({
  variations,
  value,
  isRollout,
  onChange,
  onRolloutSelect,
  label = "Serve",
}: VariationSelectorProps) {
  const variationItems = useMemo(
    () =>
      variations.map((variation) => ({
        label: variation.name,
        value: variation.id,
        color: variation.color,
      })),
    [variations]
  );

  const displayValue = isRollout ? ROLLOUT_VALUE : (value ?? "");
  const selectedVariation = variationItems.find((v) => v.value === value);

  return (
    <div className="flex w-full flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
      {label && (
        <Text className="text-ui-fg-subtle" size="small">
          {label}
        </Text>
      )}
      <Select
        onValueChange={(val) => {
          if (val === ROLLOUT_VALUE) {
            onRolloutSelect();
          } else if (val) {
            onChange(val);
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
                    className="size-2.5 shrink-0 rounded-full"
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
                    className="size-2.5 shrink-0 rounded-full"
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
  );
}
