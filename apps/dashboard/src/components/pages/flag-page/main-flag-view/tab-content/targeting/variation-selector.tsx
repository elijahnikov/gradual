import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gradual/ui/select";
import { Text } from "@gradual/ui/text";
import { useMemo } from "react";
import type { Variation } from "./types";

interface VariationSelectorProps {
  variations: Variation[];
  value: string;
  onChange: (variationId: string) => void;
  label?: string;
}

export function VariationSelector({
  variations,
  value,
  onChange,
  label = "Serve",
}: VariationSelectorProps) {
  const variationItems = useMemo(
    () =>
      variations.map((variation) => ({
        label: variation.name,
        value: variation.id,
      })),
    [variations]
  );

  return (
    <div className="flex w-full flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
      <Text className="text-ui-fg-subtle" size="small">
        {label}
      </Text>
      <Select
        items={variationItems}
        onValueChange={(val) => {
          if (val) {
            onChange(val);
          }
        }}
        value={value}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {variationItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
