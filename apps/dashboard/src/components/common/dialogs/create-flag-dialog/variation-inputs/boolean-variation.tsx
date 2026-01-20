import type { createCompleteFeatureFlagSchema } from "@gradual/api/schemas";
import { Card } from "@gradual/ui/card";
import { useFieldArray } from "@gradual/ui/form";
import type { UseFormReturn } from "react-hook-form";
import type z from "zod/v4";

export default function BooleanVariation({
  form,
}: {
  form: UseFormReturn<z.infer<typeof createCompleteFeatureFlagSchema>>;
}) {
  const { fields } = useFieldArray({
    control: form.control,
    name: "variations",
  });

  // Find ON and OFF variations
  const onVariationIndex = fields.findIndex(
    (_, i) => form.watch(`variations.${i}.value`) === true
  );
  const offVariationIndex = fields.findIndex(
    (_, i) => form.watch(`variations.${i}.value`) === false
  );

  const onVariation = onVariationIndex !== -1 ? fields[onVariationIndex] : null;
  const offVariation =
    offVariationIndex !== -1 ? fields[offVariationIndex] : null;

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <div className="space-y-2">
          <div className="font-medium text-sm text-ui-fg-base">true</div>
          <div className="text-ui-fg-muted text-xs">
            {onVariation?.name || "On"}
          </div>
        </div>
      </Card>
      <Card>
        <div className="space-y-2">
          <div className="font-medium text-sm text-ui-fg-base">false</div>
          <div className="text-ui-fg-muted text-xs">
            {offVariation?.name || "Off"}
          </div>
        </div>
      </Card>
    </div>
  );
}
