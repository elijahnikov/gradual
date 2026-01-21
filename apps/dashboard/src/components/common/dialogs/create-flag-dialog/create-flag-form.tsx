import { createCompleteFeatureFlagSchema } from "@gradual/api/schemas";
import { Badge } from "@gradual/ui/badge";
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
import { LoadingButton } from "@gradual/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gradual/ui/select";
import { Textarea } from "@gradual/ui/textarea";
import { toastManager } from "@gradual/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { RiCloseLine } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import type z from "zod/v4";
import { useTRPC } from "@/lib/trpc";
import BooleanVariation from "./variation-inputs/boolean-variation";
import JsonVariation from "./variation-inputs/json-variation";
import NumberVariation from "./variation-inputs/number-variation";
import StringVariation from "./variation-inputs/string-variation";

export default function CreateFlagForm() {
  const navigate = useNavigate();
  const params = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/flags/",
  });

  const tagInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const { mutateAsync: createFlag, isPending: isCreatingFlag } = useMutation(
    trpc.featureFlags.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.featureFlags.pathFilter());
      },
    })
  );

  const form = useForm({
    mode: "onChange",
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
      variations: [
        {
          name: "true",
          value: true,
          description: undefined,
          isDefault: true,
          isDefaultWhenOn: true,
          isDefaultWhenOff: false,
          rolloutPercentage: 0,
          sortOrder: 0,
        },
        {
          name: "false",
          value: false,
          description: undefined,
          isDefault: false,
          isDefaultWhenOn: false,
          isDefaultWhenOff: true,
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
              isDefaultWhenOn: true,
              isDefaultWhenOff: false,
              rolloutPercentage: 0,
              sortOrder: 0,
            },
            {
              name: "false",
              value: false,
              description: undefined,
              isDefault: false,
              isDefaultWhenOn: false,
              isDefaultWhenOff: true,
              rolloutPercentage: 0,
              sortOrder: 1,
            },
          ];
        case "string":
          return [
            {
              name: "Variation #1",
              value: "variation-value-1",
              description: undefined,
              isDefault: true,
              isDefaultWhenOn: true,
              isDefaultWhenOff: true,
              rolloutPercentage: 0,
              sortOrder: 0,
            },
            {
              name: "Variation #2",
              value: "variation-value-2",
              description: undefined,
              isDefault: false,
              isDefaultWhenOn: false,
              isDefaultWhenOff: false,
              rolloutPercentage: 0,
              sortOrder: 1,
            },
          ];
        case "number":
          return [
            {
              name: "Variation #1",
              value: 0,
              description: undefined,
              isDefault: true,
              isDefaultWhenOn: true,
              isDefaultWhenOff: true,
              rolloutPercentage: 0,
              sortOrder: 0,
            },
            {
              name: "Variation #2",
              value: 1,
              description: undefined,
              isDefault: false,
              isDefaultWhenOn: false,
              isDefaultWhenOff: false,
              rolloutPercentage: 0,
              sortOrder: 1,
            },
          ];
        case "json":
          return [
            {
              name: "Variation #1",
              value: {},
              description: undefined,
              isDefault: true,
              isDefaultWhenOn: true,
              isDefaultWhenOff: true,
              rolloutPercentage: 0,
              sortOrder: 0,
            },
            {
              name: "Variation #2",
              value: {},
              description: undefined,
              isDefault: false,
              isDefaultWhenOn: false,
              isDefaultWhenOff: false,
              rolloutPercentage: 0,
              sortOrder: 1,
            },
          ];
        default:
          return [];
      }
    };

    if (currentType) {
      const defaultVariations = getDefaultVariations(currentType);

      if (currentType === "boolean") {
        const trueVariationIndex = defaultVariations.findIndex(
          (v) => v.value === true
        );
        const falseVariationIndex = defaultVariations.findIndex(
          (v) => v.value === false
        );
        if (trueVariationIndex !== -1 && falseVariationIndex !== -1) {
          const updatedVariations = defaultVariations.map((v, idx) => ({
            ...v,
            isDefaultWhenOn: idx === trueVariationIndex,
            isDefaultWhenOff: idx === falseVariationIndex,
          }));
          form.setValue("variations", updatedVariations);
        }
      } else {
        const defaultVariationIndex = defaultVariations.findIndex(
          (v) => v.isDefault
        );
        if (defaultVariationIndex !== -1) {
          const updatedVariations = defaultVariations.map((v, idx) => ({
            ...v,
            isDefaultWhenOn: idx === defaultVariationIndex,
            isDefaultWhenOff: idx === defaultVariationIndex,
          }));
          form.setValue("variations", updatedVariations);
        }
      }
    }
  }, [currentType, form]);

  const onSubmit = async (
    data: z.infer<typeof createCompleteFeatureFlagSchema>
  ) => {
    try {
      await createFlag(data);
      toastManager.add({
        type: "success",
        title: "Feature flag created successfully",
        description: "Redirecting to the feature flag...",
      });
      setTimeout(() => {
        navigate({
          to: "/$organizationSlug/$projectSlug/flags/$flagSlug",
          params: {
            flagSlug: data.key,
            projectSlug: params.projectSlug,
            organizationSlug: params.organizationSlug,
          },
        });
      }, 1000);
    } catch (error) {
      console.error(error);
      toastManager.add({
        type: "error",
        title: "Failed to create feature flag",
        description: "Please try again.",
      });
    }
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
                    <FormLabel required>Name</FormLabel>
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
                    <FormLabel required>Key</FormLabel>
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

          <div>
            <div className="px-4 pt-4">
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
            </div>
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

      <div className="flex w-full items-center justify-between gap-4">
        {(() => {
          const variations = form.watch("variations");

          const validVariations = variations.filter(
            (v: (typeof variations)[number]) => v.name && v.name.trim() !== ""
          );

          if (validVariations.length === 0) {
            return null;
          }

          const validVariationIndices = variations
            .map((v: (typeof variations)[number], index: number) =>
              v.name && v.name.trim() !== "" ? index : -1
            )
            .filter((idx: number) => idx !== -1);

          // Find the current default variation indices
          const currentDefaultWhenOnIndex = variations.findIndex(
            (v: (typeof variations)[number]) => v.isDefaultWhenOn
          );
          const currentDefaultWhenOffIndex = variations.findIndex(
            (v: (typeof variations)[number]) => v.isDefaultWhenOff
          );

          return (
            <div className="flex w-full items-center gap-2 border-t px-3 py-4">
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
                  items={validVariations.map(
                    (
                      variation: (typeof validVariations)[number],
                      index: number
                    ) => ({
                      value: String(validVariationIndices[index]),
                      label: variation.name || `Variation ${index + 1}`,
                    })
                  )}
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }
                    const selectedIndex = Number.parseInt(value, 10);
                    if (!Number.isNaN(selectedIndex)) {
                      // Set isDefaultWhenOn flags on variations
                      const currentVariations = form.getValues("variations");
                      currentVariations.forEach(
                        (
                          _: (typeof currentVariations)[number],
                          index: number
                        ) => {
                          form.setValue(
                            `variations.${index}.isDefaultWhenOn`,
                            index === selectedIndex
                          );
                          // Also set as isDefault for backward compatibility
                          form.setValue(
                            `variations.${index}.isDefault`,
                            index === selectedIndex
                          );
                        }
                      );
                    }
                  }}
                  value={
                    currentDefaultWhenOnIndex !== -1
                      ? String(currentDefaultWhenOnIndex)
                      : undefined
                  }
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {validVariations.map(
                      (
                        variation: (typeof validVariations)[number],
                        index: number
                      ) => (
                        <SelectItem
                          key={index}
                          value={String(validVariationIndices[index])}
                        >
                          {variation.name || `Variation ${index + 1}`}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-ui-fg-muted text-xs">
                  When flag is <Badge variant={"destructive"}>OFF</Badge> serve:
                </span>
                <Select
                  items={validVariations.map(
                    (
                      variation: (typeof validVariations)[number],
                      index: number
                    ) => ({
                      value: String(validVariationIndices[index]),
                      label: variation.name || `Variation ${index + 1}`,
                    })
                  )}
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }
                    const selectedIndex = Number.parseInt(value, 10);
                    if (!Number.isNaN(selectedIndex)) {
                      // Set isDefaultWhenOff flags on variations
                      const currentVariations = form.getValues("variations");
                      currentVariations.forEach(
                        (
                          _: (typeof currentVariations)[number],
                          index: number
                        ) => {
                          form.setValue(
                            `variations.${index}.isDefaultWhenOff`,
                            index === selectedIndex
                          );
                        }
                      );
                    }
                  }}
                  value={
                    currentDefaultWhenOffIndex !== -1
                      ? String(currentDefaultWhenOffIndex)
                      : undefined
                  }
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {validVariations.map(
                      (
                        variation: (typeof validVariations)[number],
                        index: number
                      ) => (
                        <SelectItem
                          key={index}
                          value={String(validVariationIndices[index])}
                        >
                          {variation.name || `Variation ${index + 1}`}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })()}
      </div>
      <DialogFooter className="bottom-0 mt-auto border-t p-4">
        <LoadingButton
          className="ml-auto"
          disabled={
            !form.formState.isValid ||
            Object.keys(form.formState.errors).length > 0
          }
          form="login-form"
          loading={isCreatingFlag}
          size="small"
          type="submit"
          variant="gradual"
        >
          Create flag
        </LoadingButton>
      </DialogFooter>
    </>
  );
}
