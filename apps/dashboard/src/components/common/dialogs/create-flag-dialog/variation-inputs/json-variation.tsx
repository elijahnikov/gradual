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
import { ScrollArea } from "@gradual/ui/scroll-area";
import { Text } from "@gradual/ui/text";
import { Textarea } from "@gradual/ui/textarea";
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react";
import type { UseFormReturn } from "react-hook-form";
import type z from "zod/v4";

export default function JsonVariation({
  form,
}: {
  form: UseFormReturn<z.infer<typeof createCompleteFeatureFlagSchema>>;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variations",
  });

  return (
    <div>
      <div className="mb-2 flex items-center justify-end px-4">
        <Button
          onClick={() => {
            append({
              name: "",
              value: {},
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

      <ScrollArea className="h-102" scrollFade>
        <div className="flex flex-col gap-2 p-4">
          {fields.map((field, index) => (
            <div className="flex items-center gap-2" key={field.id}>
              <Text className="font-medium font-mono text-ui-fg-muted text-xs">
                #{index + 1}
              </Text>
              <Card
                className="group relative max-w-76 px-3 pt-1 pb-3"
                key={field.id}
              >
                <div className="flex-1 space-y-1">
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
                        <FormLabel required>Value (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            className="font-mono! [&>textarea]:font-mono!"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value;
                              try {
                                const parsed =
                                  value.trim() === "" ? {} : JSON.parse(value);
                                field.onChange(parsed);
                              } catch {
                                field.onChange(value);
                              }
                            }}
                            placeholder='{"key": "value"}'
                            size="sm"
                            value={
                              typeof field.value === "string"
                                ? field.value
                                : JSON.stringify(field.value ?? {}, null, 2)
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
                    className="absolute top-1 right-1 size-6 opacity-0 transition-opacity duration-100 group-hover:opacity-100"
                    onClick={() => remove(index)}
                    size="small"
                    type="button"
                    variant="destructive"
                  >
                    <RiDeleteBinLine className="size-4 shrink-0" />
                  </Button>
                )}
              </Card>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
