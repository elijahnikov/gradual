import type { RouterOutputs } from "@gradual/api";
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

interface DefaultVariationProps {
  defaultVariation: NonNullable<
    RouterOutputs["featureFlags"]["getTargetingRules"]["defaultVariation"]
  >;
  variations: NonNullable<
    RouterOutputs["featureFlags"]["getByKey"]["variations"]
  >;
  onDefaultVariationChange: (variationId: string) => void;
}
export default function DefaultVariation({
  defaultVariation,
  variations,
  onDefaultVariationChange,
}: DefaultVariationProps) {
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
          value={defaultVariation.id}
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
