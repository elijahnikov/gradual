import type { createCompleteFeatureFlagSchema } from "@gradual/api/schemas";
import { Badge } from "@gradual/ui/badge";
import { Card } from "@gradual/ui/card";
import { useFieldArray } from "@gradual/ui/form";
import { Text } from "@gradual/ui/text";
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

  const trueVariationIndex = fields.findIndex(
    (_, i) => form.watch(`variations.${i}.value`) === true
  );
  const falseVariationIndex = fields.findIndex(
    (_, i) => form.watch(`variations.${i}.value`) === false
  );

  const trueVariation =
    trueVariationIndex !== -1 ? fields[trueVariationIndex] : null;
  const falseVariation =
    falseVariationIndex !== -1 ? fields[falseVariationIndex] : null;

  return (
    <div className="mt-4 flex flex-col gap-2 px-4">
      <div className="flex items-center gap-2">
        <Text className="font-medium font-mono text-ui-fg-muted text-xs">
          #1
        </Text>
        <Card>
          <Badge size="lg" variant="outline">
            <Text weight="plus">{trueVariation?.name || "true"}</Text>
          </Badge>
        </Card>
      </div>
      <div className="flex items-center gap-2">
        <Text className="font-medium font-mono text-ui-fg-muted text-xs">
          #2
        </Text>
        <Card>
          <Badge size="lg" variant="outline">
            <Text weight="plus">{falseVariation?.name || "false"}</Text>
          </Badge>
        </Card>
      </div>
    </div>
  );
}
