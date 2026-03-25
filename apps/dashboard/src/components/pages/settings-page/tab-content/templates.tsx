import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { Checkbox } from "@gradual/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@gradual/ui/dialog";
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
import { ScrollArea } from "@gradual/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gradual/ui/select";
import { Text } from "@gradual/ui/text";
import { Textarea } from "@gradual/ui/textarea";
import { toastManager } from "@gradual/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiFileTextLine,
  RiLockLine,
} from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import z from "zod/v4";
import { useTRPC } from "@/lib/trpc";

const templateVariationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.union([z.string(), z.number(), z.boolean()]),
  isDefault: z.boolean(),
});

const templateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(["boolean", "string", "number", "json"]),
  variations: z.array(templateVariationSchema).min(1, "At least one variation"),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

export default function TemplatesSettings() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <Text className="text-ui-fg-muted" size="small">
            Loading...
          </Text>
        </div>
      }
    >
      <TemplatesSettingsContent />
    </Suspense>
  );
}

function TemplatesSettingsContent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { organizationSlug } = useParams({ strict: false });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery(
    trpc.flagTemplates.list.queryOptions(
      { organizationSlug: organizationSlug ?? "" },
      { enabled: !!organizationSlug }
    )
  );

  const { mutateAsync: deleteTemplate, isPending: isDeleting } = useMutation(
    trpc.flagTemplates.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.flagTemplates.pathFilter());
        setDeleteConfirmId(null);
        toastManager.add({
          title: "Template deleted",
          type: "success",
        });
      },
    })
  );

  const handleDelete = async (templateId: string) => {
    try {
      await deleteTemplate({
        templateId,
        organizationSlug: organizationSlug ?? "",
      });
    } catch {
      toastManager.add({
        title: "Failed to delete template",
        type: "error",
      });
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-12 min-h-12 items-center justify-between border-b bg-ui-bg-subtle px-4 py-2">
        <Text className="text-ui-fg-muted" size="xsmall">
          Manage flag templates for quick flag creation
        </Text>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          size="small"
          variant="outline"
        >
          <RiAddLine className="size-3.5" />
          New template
        </Button>
      </div>

      <div className="flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Text className="text-ui-fg-muted" size="small">
              Loading templates...
            </Text>
          </div>
        ) : templates?.length ? (
          templates.map((template) => {
            const config = template.config as {
              type: string;
              variations: Array<{
                name: string;
                value: unknown;
                isDefault: boolean;
              }>;
            };
            return (
              <div
                className="flex items-center justify-between border-b px-4 py-3"
                key={template.id}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Text size="small" weight="plus">
                      {template.name}
                    </Text>
                    {template.isSystem && (
                      <Badge className="gap-1" variant="outline">
                        <RiLockLine className="size-3" />
                        System
                      </Badge>
                    )}
                    <Text className="text-ui-fg-muted" size="xsmall">
                      {config.variations.length} variation
                      {config.variations.length !== 1 ? "s" : ""}
                    </Text>
                  </div>
                  {template.description && (
                    <Text className="text-ui-fg-muted" size="xsmall">
                      {template.description}
                    </Text>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {template.usageCount > 0 && (
                    <Text className="mr-2 text-ui-fg-muted" size="xsmall">
                      Used {template.usageCount}x
                    </Text>
                  )}
                  {!template.isSystem && (
                    <>
                      <Button
                        className="size-6 shrink-0"
                        onClick={() => setEditingTemplate(template.id)}
                        size="small"
                        variant="outline"
                      >
                        <RiEditLine className="size-3.5 shrink-0" />
                      </Button>
                      <Button
                        className="size-6 shrink-0"
                        onClick={() => setDeleteConfirmId(template.id)}
                        size="small"
                        variant="outline"
                      >
                        <RiDeleteBinLine className="size-3.5 shrink-0 text-ui-fg-error" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-ui-fg-muted">
            <RiFileTextLine className="size-8 text-ui-fg-muted/50" />
            <Text size="small">No templates yet</Text>
            <Text className="text-ui-fg-muted" size="xsmall">
              Create a template to speed up flag creation
            </Text>
          </div>
        )}
      </div>

      <TemplateFormDialog
        onOpenChange={setCreateDialogOpen}
        open={createDialogOpen}
        organizationSlug={organizationSlug ?? ""}
      />

      {editingTemplate && (
        <TemplateFormDialog
          initialValues={(() => {
            const t = templates?.find((t) => t.id === editingTemplate);
            if (!t) {
              return undefined;
            }
            const config = t.config as {
              type: string;
              variations: Array<{
                name: string;
                value: string | number | boolean;
                isDefault: boolean;
              }>;
            };
            return {
              name: t.name,
              description: t.description ?? undefined,
              type: config.type as TemplateFormValues["type"],
              variations: config.variations,
            };
          })()}
          onOpenChange={(open) => {
            if (!open) {
              setEditingTemplate(null);
            }
          }}
          open={!!editingTemplate}
          organizationSlug={organizationSlug ?? ""}
          templateId={editingTemplate}
        />
      )}

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmId(null);
          }
        }}
        open={!!deleteConfirmId}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-medium text-[14px]">
              Delete template
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <Text className="text-ui-fg-muted" size="small">
              Are you sure you want to delete this template? This action cannot
              be undone.
            </Text>
          </div>
          <DialogFooter className="border-t p-4">
            <Button
              onClick={() => setDeleteConfirmId(null)}
              size="small"
              variant="outline"
            >
              Cancel
            </Button>
            <LoadingButton
              loading={isDeleting}
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              size="small"
              variant="destructive"
            >
              Delete
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateFormDialog({
  open,
  onOpenChange,
  organizationSlug,
  templateId,
  initialValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationSlug: string;
  templateId?: string;
  initialValues?: TemplateFormValues;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { mutateAsync: createTemplate, isPending: isCreating } = useMutation(
    trpc.flagTemplates.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.flagTemplates.pathFilter());
      },
    })
  );

  const { mutateAsync: updateTemplate, isPending: isUpdating } = useMutation(
    trpc.flagTemplates.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.flagTemplates.pathFilter());
      },
    })
  );

  const isEditing = !!templateId;
  const isPending = isCreating || isUpdating;

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: initialValues ?? {
      name: "",
      description: "",
      type: "boolean",
      variations: [
        { name: "true", value: true, isDefault: true },
        { name: "false", value: false, isDefault: false },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variations",
  });

  const currentType = form.watch("type");

  const onSubmit = async (data: TemplateFormValues) => {
    try {
      const config = {
        type: data.type,
        variations: data.variations,
      };

      if (isEditing && templateId) {
        await updateTemplate({
          templateId,
          organizationSlug,
          name: data.name,
          description: data.description ?? null,
          config,
        });
        toastManager.add({
          title: "Template updated",
          type: "success",
        });
      } else {
        await createTemplate({
          organizationSlug,
          name: data.name,
          description: data.description,
          config,
        });
        toastManager.add({
          title: "Template created",
          type: "success",
        });
      }
      onOpenChange(false);
    } catch {
      toastManager.add({
        title: `Failed to ${isEditing ? "update" : "create"} template`,
        type: "error",
      });
    }
  };

  const handleSetDefault = (index: number) => {
    for (let i = 0; i < fields.length; i++) {
      form.setValue(`variations.${i}.isDefault`, i === index);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="relative top-8 flex min-h-[80vh] min-w-[70vw] flex-col">
        <DialogHeader>
          <DialogTitle className="font-medium text-[14px]">
            {isEditing ? "Edit template" : "Create template"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid h-full grid-cols-2 divide-x"
            id="template-form"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="space-y-4 p-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Kill switch" {...field} />
                    </FormControl>
                    <FormMessage className="text-ui-fg-error" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A description of this template"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
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

              <div className="my-2 flex items-center justify-end px-4">
                <Button
                  onClick={() =>
                    append({
                      name: `Variation #${fields.length + 1}`,
                      value:
                        currentType === "boolean"
                          ? false
                          : currentType === "number"
                            ? 0
                            : "",
                      isDefault: false,
                    })
                  }
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
                      <Card className="group relative px-3 pt-1 pb-3">
                        <div className="grid grid-cols-2 gap-2">
                          <FormField
                            control={form.control}
                            name={`variations.${index}.name`}
                            render={({ field: nameField }) => (
                              <FormItem>
                                <FormLabel required>Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Variation name"
                                    {...nameField}
                                  />
                                </FormControl>
                                <FormMessage className="text-ui-fg-error" />
                              </FormItem>
                            )}
                          />
                          {currentType === "boolean" ? (
                            <FormField
                              control={form.control}
                              name={`variations.${index}.value`}
                              render={() => (
                                <FormItem>
                                  <FormLabel required>Value</FormLabel>
                                  <FormControl>
                                    <Select
                                      items={[
                                        { value: "true", label: "true" },
                                        { value: "false", label: "false" },
                                      ]}
                                      onValueChange={(v) =>
                                        form.setValue(
                                          `variations.${index}.value`,
                                          v === "true"
                                        )
                                      }
                                      value={String(
                                        form.watch(`variations.${index}.value`)
                                      )}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent
                                        alignItemWithTrigger={false}
                                      >
                                        <SelectItem value="true">
                                          true
                                        </SelectItem>
                                        <SelectItem value="false">
                                          false
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          ) : (
                            <FormField
                              control={form.control}
                              name={`variations.${index}.value`}
                              render={({ field: valueField }) => (
                                <FormItem>
                                  <FormLabel required>Value</FormLabel>
                                  <FormControl>
                                    <Input
                                      name={valueField.name}
                                      onBlur={valueField.onBlur}
                                      onChange={(e) =>
                                        currentType === "number"
                                          ? valueField.onChange(
                                              Number(e.target.value)
                                            )
                                          : valueField.onChange(e.target.value)
                                      }
                                      placeholder={
                                        currentType === "number"
                                          ? "0"
                                          : "String value"
                                      }
                                      ref={valueField.ref}
                                      type={
                                        currentType === "number"
                                          ? "number"
                                          : "text"
                                      }
                                      value={
                                        typeof valueField.value === "string" ||
                                        typeof valueField.value === "number"
                                          ? String(valueField.value)
                                          : ""
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage className="text-ui-fg-error" />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>

                        <label
                          className="mt-2 flex cursor-pointer items-center gap-1.5"
                          htmlFor={`variation-default-${index}`}
                        >
                          <Checkbox
                            checked={form.watch(
                              `variations.${index}.isDefault`
                            )}
                            id={`variation-default-${index}`}
                            onCheckedChange={() => handleSetDefault(index)}
                          />
                          <Text className="text-ui-fg-muted" size="xsmall">
                            Default
                          </Text>
                        </label>

                        {fields.length > 1 && (
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
          </form>
        </Form>

        <DialogFooter className="bottom-0 mt-auto border-t p-4">
          <LoadingButton
            className="ml-auto"
            form="template-form"
            loading={isPending}
            size="small"
            type="submit"
            variant="gradual"
          >
            {isEditing ? "Save changes" : "Create template"}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
