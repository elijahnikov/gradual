import { createSegmentSchema } from "@gradual/api/schemas";
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
import { Textarea } from "@gradual/ui/textarea";
import { toastManager } from "@gradual/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import type z from "zod/v4";
import { useTRPC } from "@/lib/trpc";

const formSchema = createSegmentSchema.omit({
  organizationSlug: true,
  projectSlug: true,
  conditions: true,
});

interface CreateSegmentFormProps {
  onSuccess?: () => void;
}

export default function CreateSegmentForm({
  onSuccess,
}: CreateSegmentFormProps) {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const { mutateAsync: createSegment, isPending } = useMutation(
    trpc.segments.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.segments.pathFilter());
      },
    })
  );

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      key: "",
      description: "",
    },
  });

  const keyTouched = useRef(false);
  const name = form.watch("name");

  useEffect(() => {
    if (!name || keyTouched.current) {
      return;
    }
    const autoKey = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (autoKey) {
      form.setValue("key", autoKey, { shouldValidate: true });
    }
  }, [name, form]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!(params.organizationSlug && params.projectSlug)) {
      toastManager.add({
        title: "Organization or project not found",
        description: "Please select an organization and project",
        type: "error",
      });
      return;
    }
    try {
      await createSegment({
        ...data,
        conditions: [],
        organizationSlug: params.organizationSlug,
        projectSlug: params.projectSlug,
      });
      toastManager.add({
        title: "Segment created",
        description: "The segment has been created",
        type: "success",
      });
      onSuccess?.();
      navigate({
        to: "/$organizationSlug/$projectSlug/segments/$segmentSlug",
        params: {
          organizationSlug: params.organizationSlug,
          projectSlug: params.projectSlug,
          segmentSlug: data.key,
        },
      });
    } catch (error) {
      console.error(error);
      toastManager.add({
        title: "Failed to create segment",
        description:
          error instanceof Error ? error.message : "Please try again",
        type: "error",
      });
    }
  };

  return (
    <>
      <Form {...form}>
        <form
          className="flex flex-col gap-4 p-3"
          id="create-segment-form"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Beta Users" {...field} />
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
                  <Input
                    placeholder="beta-users"
                    {...field}
                    onChange={(e) => {
                      keyTouched.current = e.target.value.length > 0;
                      field.onChange(e);
                    }}
                  />
                </FormControl>
                <FormDescription className="text-ui-fg-muted text-xs">
                  Lowercase with hyphens. Used to reference this segment in the
                  SDK and flags configuration.
                </FormDescription>
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
                    className="resize-none"
                    placeholder="Users who have opted into beta features"
                    rows={2}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
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
          form="create-segment-form"
          loading={isPending}
          size="small"
          type="submit"
          variant="gradual"
        >
          Create segment
        </LoadingButton>
      </DialogFooter>
    </>
  );
}
