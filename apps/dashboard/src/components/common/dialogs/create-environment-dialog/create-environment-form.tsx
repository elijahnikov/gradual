import { createEnvironmentSchema } from "@gradual/api/schemas";
import { getRandomEnvironmentColor } from "@gradual/api/utils";
import { DialogFooter } from "@gradual/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@gradual/ui/form";
import { Input } from "@gradual/ui/input";
import { LoadingButton } from "@gradual/ui/loading-button";
import { toastManager } from "@gradual/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import type z from "zod/v4";
import EnvironmentColorPicker from "@/components/common/environment-color-picker";
import { useTRPC } from "@/lib/trpc";

const createSchema = createEnvironmentSchema.omit({
  organizationSlug: true,
  projectSlug: true,
});

export default function CreateEnvironmentForm() {
  const params = useParams({
    strict: false,
  });

  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const { mutateAsync: createEnvironment, isPending: isCreatingEnvironment } =
    useMutation(
      trpc.environment.create.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries(trpc.environment.pathFilter());
        },
      })
    );

  const form = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      slug: "",
      color: getRandomEnvironmentColor(),
    },
  });

  const slugTouched = useRef(false);
  const name = form.watch("name");

  useEffect(() => {
    if (!name || slugTouched.current) {
      return;
    }
    const autoSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (autoSlug) {
      form.setValue("slug", autoSlug, { shouldValidate: true });
    }
  }, [name, form]);

  const onSubmit = async (data: z.infer<typeof createSchema>) => {
    if (!(params.organizationSlug && params.projectSlug)) {
      toastManager.add({
        title: "Organization or project not found",
        description: "Please select an organization and project",
        type: "error",
      });
      return;
    }
    try {
      await createEnvironment({
        ...data,
        organizationSlug: params.organizationSlug ?? "",
        projectSlug: params.projectSlug ?? "",
      });
      toastManager.add({
        title: "Environment created successfully",
        description: "The environment has been created",
        type: "success",
      });
    } catch (error) {
      console.error(error);
      toastManager.add({
        title: "Failed to create environment",
        description: "Please try again",
        type: "error",
      });
    }
  };

  return (
    <>
      <Form {...form}>
        <form
          className="flex items-start gap-4 p-3"
          id="create-environment-form"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <Controller
            control={form.control}
            name="color"
            render={({ field }) => (
              <div className="relative top-7.5">
                <EnvironmentColorPicker
                  onChange={field.onChange}
                  value={field.value ?? undefined}
                />
              </div>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Testing" {...field} />
                </FormControl>
                <FormMessage className="text-ui-fg-error" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Slug</FormLabel>
                <FormControl>
                  <Input
                    placeholder="testing"
                    {...field}
                    onChange={(e) => {
                      slugTouched.current = e.target.value.length > 0;
                      field.onChange(e);
                    }}
                  />
                </FormControl>
                <FormDescription className="text-ui-fg-muted text-xs">
                  The slug is used to identify the environment in the Gradual
                  SDK.
                </FormDescription>
                <FormMessage className="text-ui-fg-error" />
              </FormItem>
            )}
          />
        </form>
      </Form>
      <DialogFooter className="bottom-0 mt-auto border-t p-4">
        <LoadingButton
          className="ml-auto"
          disabled={
            !form.formState.isValid ||
            Object.keys(form.formState.errors).length > 0
          }
          form="create-environment-form"
          loading={isCreatingEnvironment}
          size="small"
          type="submit"
          variant="gradual"
        >
          Create environment
        </LoadingButton>
      </DialogFooter>
    </>
  );
}
