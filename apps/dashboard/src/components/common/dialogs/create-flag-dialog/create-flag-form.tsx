import { createCompleteFeatureFlagSchema } from "@gradual/api/schemas";
import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import { DialogFooter } from "@gradual/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@gradual/ui/form";
import { Input } from "@gradual/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gradual/ui/select";
import { Textarea } from "@gradual/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { RiCloseLine } from "@remixicon/react";
import { useParams } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import type z from "zod/v4";
import BooleanVariation from "./variation-inputs/boolean-variation";
import JsonVariation from "./variation-inputs/json-variation";
import NumberVariation from "./variation-inputs/number-variation";
import StringVariation from "./variation-inputs/string-variation";

export default function CreateFlagForm() {
  const params = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/flags/",
  });

  const tagInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    resolver: zodResolver(createCompleteFeatureFlagSchema),
    defaultValues: {
      projectSlug: params.projectSlug,
      organizationSlug: params.organizationSlug,
      key: "",
      name: "",
      description: undefined,
      type: "boolean",
      status: "draft",
      tags: [] as string[],
      maintainerId: undefined,
      variations: [
        {
          name: "On",
          value: true,
          description: undefined,
          isDefault: true,
          rolloutPercentage: 0,
          sortOrder: 0,
        },
        {
          name: "Off",
          value: false,
          description: undefined,
          isDefault: false,
          rolloutPercentage: 0,
          sortOrder: 1,
        },
      ],
      environmentConfigs: [],
    },
  });

  const currentType = form.watch("type");

  useEffect(() => {
    const getDefaultVariations = (type: string) => {
      switch (type) {
        case "boolean":
          return [
            {
              name: "true",
              value: true,
              description: undefined,
              isDefault: true,
              rolloutPercentage: 0,
              sortOrder: 0,
            },
            {
              name: "false",
              value: false,
              description: undefined,
              isDefault: false,
              rolloutPercentage: 0,
              sortOrder: 1,
            },
          ];
        case "string":
          return [
            {
              name: "Default",
              value: "",
              description: undefined,
              isDefault: true,
              rolloutPercentage: 0,
              sortOrder: 0,
            },
            {
              name: "Alternative",
              value: "",
              description: undefined,
              isDefault: false,
              rolloutPercentage: 0,
              sortOrder: 1,
            },
          ];
        case "number":
          return [
            {
              name: "Default",
              value: 0,
              description: undefined,
              isDefault: true,
              rolloutPercentage: 0,
              sortOrder: 0,
            },
            {
              name: "Alternative",
              value: 0,
              description: undefined,
              isDefault: false,
              rolloutPercentage: 0,
              sortOrder: 1,
            },
          ];
        case "json":
          return [
            {
              name: "Default",
              value: {},
              description: undefined,
              isDefault: true,
              rolloutPercentage: 0,
              sortOrder: 0,
            },
            {
              name: "Alternative",
              value: {},
              description: undefined,
              isDefault: false,
              rolloutPercentage: 0,
              sortOrder: 1,
            },
          ];
        default:
          return [];
      }
    };

    if (currentType) {
      form.setValue("variations", getDefaultVariations(currentType));
    }
  }, [currentType, form]);

  const onSubmit = (data: z.infer<typeof createCompleteFeatureFlagSchema>) => {
    console.log("Form submitted:", data);
  };

  return (
    <>
      <Form {...form}>
        <form
          className="grid h-full grid-cols-2 divide-x"
          id="login-form"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Feature Flag" {...field} />
                    </FormControl>
                    <FormMessage className="text-ui-fg-error" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key</FormLabel>
                    <FormControl>
                      <Input placeholder="my-feature-flag" {...field} />
                    </FormControl>
                    <FormMessage className="text-ui-fg-error" />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="A description of the feature flag"
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage className="text-ui-fg-error" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => {
                const tags = Array.isArray(field.value) ? field.value : [];

                const addTag = (tag: string) => {
                  const trimmedTag = tag.trim();
                  if (
                    trimmedTag &&
                    !tags.includes(trimmedTag) &&
                    trimmedTag.length > 0
                  ) {
                    field.onChange([...tags, trimmedTag]);
                    if (tagInputRef.current) {
                      tagInputRef.current.value = "";
                    }
                  }
                };

                const removeTag = (tagToRemove: string) => {
                  field.onChange(tags.filter((tag) => tag !== tagToRemove));
                };

                const handleKeyDown = (
                  e: React.KeyboardEvent<HTMLInputElement>
                ) => {
                  const inputValue = e.currentTarget.value;
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag(inputValue);
                  } else if (
                    e.key === "Backspace" &&
                    inputValue === "" &&
                    tags.length > 0
                  ) {
                    const lastTag = tags.at(-1);
                    if (lastTag) {
                      removeTag(lastTag);
                    }
                  }
                };

                return (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input
                        onKeyDown={handleKeyDown}
                        placeholder="Add tags (press Enter or comma)"
                        ref={tagInputRef}
                      />
                    </FormControl>
                    <FormMessage className="text-ui-fg-error" />
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <Badge
                            className="flex items-center gap-x-0.5 p-1.5 text-ui-fg-base"
                            key={tag}
                            size="default"
                            variant="outline"
                          >
                            <span>{tag}</span>
                            <button
                              className="rounded-xs"
                              onClick={() => removeTag(tag)}
                              type="button"
                            >
                              <RiCloseLine className="size-3 shrink-0" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </FormItem>
                );
              }}
            />
          </div>

          <div className="space-y-4 p-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => {
                const items = [
                  { value: "boolean", label: "Boolean" },
                  { value: "string", label: "String" },
                  { value: "number", label: "Number" },
                  { value: "json", label: "JSON" },
                ];
                return (
                  <FormItem>
                    <FormLabel required>Type</FormLabel>
                    <FormControl>
                      <Select
                        items={items}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          {items.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                );
              }}
            />
            {currentType === "boolean" && (
              <BooleanVariation
                form={
                  form as UseFormReturn<
                    z.infer<typeof createCompleteFeatureFlagSchema>
                  >
                }
              />
            )}
            {currentType === "string" && (
              <StringVariation
                form={
                  form as UseFormReturn<
                    z.infer<typeof createCompleteFeatureFlagSchema>
                  >
                }
              />
            )}
            {currentType === "number" && (
              <NumberVariation
                form={
                  form as UseFormReturn<
                    z.infer<typeof createCompleteFeatureFlagSchema>
                  >
                }
              />
            )}
            {currentType === "json" && (
              <JsonVariation
                form={
                  form as UseFormReturn<
                    z.infer<typeof createCompleteFeatureFlagSchema>
                  >
                }
              />
            )}
          </div>
        </form>
      </Form>
      <DialogFooter className="bottom-0 mt-auto border-t p-4">
        <div className="flex w-full items-center justify-between gap-4">
          {(() => {
            const variations = form.watch("variations");
            const defaultVariationIndex = variations.findIndex(
              (v) => v.isDefault === true
            );

            const validVariations = variations.filter(
              (v) => v.name && v.name.trim() !== ""
            );

            if (validVariations.length === 0) {
              return null;
            }

            return (
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-ui-fg-muted text-xs">
                  When flag is{" "}
                  <Badge
                    className="border border-green-500/20"
                    variant={"success"}
                  >
                    ON
                  </Badge>{" "}
                  serve:
                </span>
                <Select
                  items={validVariations.map((variation) => ({
                    value: variation.name,
                    label: variation.name,
                  }))}
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }
                    const currentVariations = form.getValues("variations");
                    const selectedIndex = currentVariations.findIndex(
                      (v) => v.name === value
                    );
                    if (selectedIndex !== -1) {
                      currentVariations.forEach((_, index) => {
                        form.setValue(
                          `variations.${index}.isDefault`,
                          index === selectedIndex
                        );
                      });
                    }
                  }}
                  value={
                    defaultVariationIndex !== -1 &&
                    variations[defaultVariationIndex]?.name?.trim() !== ""
                      ? variations[defaultVariationIndex]?.name
                      : undefined
                  }
                >
                  <SelectTrigger className="h-7 w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {validVariations.map((variation, index) => (
                      <SelectItem key={index} value={variation.name}>
                        {variation.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })()}
          <Button
            form="login-form"
            size="small"
            type="submit"
            variant="gradual"
          >
            Create flag
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
