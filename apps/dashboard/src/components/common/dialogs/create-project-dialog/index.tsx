import { createProjectSchema } from "@gradual/api/schemas";
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
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import type z from "zod/v4";
import { useTRPC } from "@/lib/trpc";

const formSchema = createProjectSchema.omit({
  organizationId: true,
});

export default function CreateProjectDialog({
  open,
  onOpenChange,
  organizationId,
  organizationSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationSlug: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutateAsync: createProject, isPending } = useMutation(
    trpc.project.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.project.pathFilter());
        queryClient.invalidateQueries(trpc.organization.pathFilter());
      },
    })
  );

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({ name: "", slug: "" });
      slugTouched.current = false;
    }
  }, [open, form]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      const created = await createProject({
        ...data,
        organizationId,
      });
      toastManager.add({
        title: "Project created",
        description: `${created.name} has been created`,
        type: "success",
      });
      onOpenChange(false);
      navigate({
        to: "/$organizationSlug/$projectSlug",
        params: { organizationSlug, projectSlug: created.slug },
      });
    } catch (error) {
      console.error(error);
      toastManager.add({
        title: "Failed to create project",
        description: "Please try again",
        type: "error",
      });
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-medium text-[14px]">
            Create a new project
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="flex items-start gap-4 p-3"
            id="create-project-form"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel required>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Project" {...field} />
                  </FormControl>
                  <FormMessage className="text-ui-fg-error" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel required>Slug</FormLabel>
                  <FormControl>
                    <Input
                      className="w-full"
                      placeholder="my-project"
                      {...field}
                      onChange={(e) => {
                        slugTouched.current = e.target.value.length > 0;
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormDescription className="text-ui-fg-muted text-xs">
                    The slug is used to identify the project in URLs.
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
            form="create-project-form"
            loading={isPending}
            size="small"
            type="submit"
            variant="gradual"
          >
            Create project
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
