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
  // Get variations from store (eliminates prop drilling)
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
    <Card className="flex min-w-xl max-w-xl items-center justify-between gap-2">
      <Badge size="lg" variant="outline">
        Default
      </Badge>
      <div className="flex items-center gap-2">
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
          <SelectTrigger className="w-40">
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
