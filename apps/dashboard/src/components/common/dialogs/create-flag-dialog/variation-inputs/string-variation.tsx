import type { createCompleteFeatureFlagSchema } from "@gradual/api/schemas";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
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

export default function StringVariation({
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
              value: "",
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
        <Card key={field.id}>
          <div className="flex items-start justify-between">
            <div className="grid grid-cols-2 gap-4">
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
                        name={field.name}
                        onBlur={field.onBlur}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="String value"
                        ref={field.ref}
                        type="text"
                        value={
                          typeof field.value === "string" ? field.value : ""
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
        </Card>
      ))}
    </div>
  );
}
