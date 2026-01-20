import type { createCompleteFeatureFlagSchema } from "@gradual/api/schemas";
import { Button } from "@gradual/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFieldArray,
} from "@gradual/ui/form";
import { Input } from "@gradual/ui/input";
import { Label } from "@gradual/ui/label";
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react";
import type { UseFormReturn } from "react-hook-form";
import type z from "zod/v4";

export default function NumberVariation({
  form,
}: {
  form: UseFormReturn<z.infer<typeof createCompleteFeatureFlagSchema>>;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variations",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-ui-fg-base">Variations</Label>
        <Button
          onClick={() => {
            append({
              name: "",
              value: 0,
              description: undefined,
              isDefault: fields.length === 0,
              rolloutPercentage: 0,
              sortOrder: fields.length,
            });
          }}
          size="small"
          type="button"
          variant="outline"
        >
          <RiAddLine className="size-4" />
          Add Variation
        </Button>
      </div>

      {fields.map((field, index) => (
        <div className="space-y-3 rounded-md border p-4" key={field.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <FormField
                control={form.control}
                name={`variations.${index}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Variation name" {...field} />
                    </FormControl>
                    <FormMessage className="text-ui-fg-error" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`variations.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Value</FormLabel>
                    <FormControl>
                      <Input
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? 0 : Number(value));
                        }}
                        placeholder="Number value"
                        type="number"
                        value={
                          typeof field.value === "number"
                            ? String(field.value)
                            : ""
                        }
                      />
                    </FormControl>
                    <FormMessage className="text-ui-fg-error" />
                  </FormItem>
                )}
              />
            </div>

            {fields.length > 2 && (
              <Button
                onClick={() => remove(index)}
                size="small"
                type="button"
                variant="ghost"
              >
                <RiDeleteBinLine className="size-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
