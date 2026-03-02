import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
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
import { Label } from "@gradual/ui/label";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod/v4";
import { PermissionTooltip } from "@/components/common/permission-tooltip";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useTRPC } from "@/lib/trpc";

export default function GeneralSettings() {
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
      <GeneralSettingsContent />
    </Suspense>
  );
}

const updateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

function GeneralSettingsContent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { organizationSlug, projectSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/settings/",
  });
  const { canUpdateProject, canDeleteProject } = usePermissions();

  const { data: project } = useSuspenseQuery(
    trpc.project.getBySlug.queryOptions({
      slug: projectSlug,
      organizationSlug,
    })
  );

  const { mutateAsync: updateProject, isPending: isUpdating } = useMutation(
    trpc.project.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.project.pathFilter());
      },
    })
  );

  const form = useForm({
    resolver: zodResolver(updateFormSchema),
    defaultValues: {
      name: project.name,
    },
  });

  const onSubmit = async (data: z.infer<typeof updateFormSchema>) => {
    try {
      await updateProject({
        projectId: project.id,
        name: data.name,
      });
      toastManager.add({
        title: "Project updated",
        description: "Your project settings have been saved",
        type: "success",
      });
    } catch {
      toastManager.add({
        title: "Failed to update project",
        description: "Please try again",
        type: "error",
      });
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-12 min-h-12 items-center border-b bg-ui-bg-subtle px-4 py-2">
        <Text className="text-ui-fg-muted" size="xsmall">
          Project name, slug, and other settings
        </Text>
      </div>
      <div className="flex flex-col">
        <Form {...form}>
          <form
            className="flex w-full flex-col gap-4 border-b p-4"
            id="general-settings-form"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Project Name</FormLabel>
                  <FormControl>
                    <Input
                      className="max-w-lg"
                      disabled={!canUpdateProject}
                      placeholder="My Project"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-ui-fg-error" />
                </FormItem>
              )}
            />
            <div className="flex flex-col gap-1.5">
              <Label className="inline-flex items-center gap-x-0.5 font-medium text-xs!">
                Slug
              </Label>
              <Input className="max-w-lg" disabled value={project.slug} />
            </div>
            <PermissionTooltip hasPermission={canUpdateProject}>
              <LoadingButton
                className="self-start"
                disabled={!form.formState.isDirty}
                form="general-settings-form"
                loading={isUpdating}
                size="small"
                type="submit"
                variant="gradual"
              >
                Save changes
              </LoadingButton>
            </PermissionTooltip>
          </form>
        </Form>

        <div className="w-full border-b p-4">
          <Text className="text-ui-fg-error" size="small" weight="plus">
            Danger Zone
          </Text>
          <Text className="mt-1 text-ui-fg-muted" size="xsmall">
            Deleting a project is permanent and cannot be undone. All flags,
            environments, and evaluation data will be lost.
          </Text>
          <div className="mt-4">
            <PermissionTooltip
              hasPermission={canDeleteProject}
              message="You don't have permission to delete this project"
            >
              <DeleteProjectButton
                projectId={project.id}
                projectName={project.name}
              />
            </PermissionTooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { organizationSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/settings/",
  });

  const { mutateAsync: deleteProject, isPending } = useMutation(
    trpc.project.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.project.pathFilter());
        queryClient.invalidateQueries(trpc.organization.pathFilter());
      },
    })
  );

  const handleDelete = async () => {
    try {
      await deleteProject({ projectId });
      toastManager.add({
        title: "Project deleted",
        description: `${projectName} has been deleted`,
        type: "success",
      });
      setOpen(false);
      navigate({
        to: "/$organizationSlug",
        params: { organizationSlug },
      });
    } catch {
      toastManager.add({
        title: "Failed to delete project",
        description: "Please try again",
        type: "error",
      });
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} size="small" variant="destructive">
        Delete project
      </Button>
      <Dialog
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setConfirmValue("");
          }
        }}
        open={open}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-medium text-[14px]">
              Delete project
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 p-4">
            <Text className="text-ui-fg-muted" size="small">
              This action cannot be undone. All flags, environments, and
              evaluation data will be permanently deleted.
            </Text>
            <div className="flex flex-col gap-2">
              <Label className="text-xs">
                Type{" "}
                <Badge className="-mx-1 font-semibold" variant="outline">
                  {projectName}
                </Badge>{" "}
                to confirm
              </Label>
              <Input
                onChange={(e) => setConfirmValue(e.target.value)}
                placeholder={projectName}
                value={confirmValue}
              />
            </div>
          </div>
          <DialogFooter className="border-t p-4">
            <Button
              onClick={() => setOpen(false)}
              size="small"
              variant="outline"
            >
              Cancel
            </Button>
            <LoadingButton
              disabled={confirmValue !== projectName}
              loading={isPending}
              onClick={handleDelete}
              size="small"
              variant="destructive"
            >
              Delete project
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
