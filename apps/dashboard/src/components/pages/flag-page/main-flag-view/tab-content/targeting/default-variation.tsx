import { Badge } from "@gradual/ui/badge";
import { Card } from "@gradual/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gradual/ui/select";
import { Text } from "@gradual/ui/text";
import { useMemo } from "react";
import { useTargetingStore } from "./targeting-store";

interface DefaultVariationProps {
  defaultVariationId: string;
  onDefaultVariationChange: (variationId: string) => void;
}

export default function DefaultVariation({
  defaultVariationId,
  onDefaultVariationChange,
}: DefaultVariationProps) {
  const variations = useTargetingStore((s) => s.variations);

  const variationItems = useMemo(
    () =>
      variations.map((variation) => ({
        label: variation.name,
        value: variation.id,
      })),
    [variations]
  );

  return (
    <Card className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
      <Badge size="lg" variant="outline">
        Default
      </Badge>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Text className="text-ui-fg-subtle" size="small">
          If no rules match, serve
        </Text>
        <Select
          items={variationItems}
          onValueChange={(value) => {
            if (value) {
              onDefaultVariationChange(value);
            }
          }}
          value={defaultVariationId}
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
    </Card>
  );
}
