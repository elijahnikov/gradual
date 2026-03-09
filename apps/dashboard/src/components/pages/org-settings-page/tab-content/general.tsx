import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
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
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { RiBuilding2Fill, RiCloseLine, RiGlobeLine } from "@remixicon/react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod/v4";
import { PermissionTooltip } from "@/components/common/permission-tooltip";
import { useFileUpload } from "@/lib/hooks/use-file-upload";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useTRPC } from "@/lib/trpc";

export default function OrgGeneralSettings() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col">
          <div className="flex h-12 min-h-12 items-center border-b bg-ui-bg-subtle px-4 py-2">
            <Skeleton className="h-3.5 w-64" />
          </div>
          <div className="flex flex-col gap-4 border-b p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 rounded-full" />
              <Skeleton className="h-3.5 w-40" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-9 max-w-lg" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-9 max-w-lg" />
            </div>
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      }
    >
      <OrgGeneralSettingsContent />
    </Suspense>
  );
}

const updateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with hyphens"
    ),
});

function OrgGeneralSettingsContent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { organizationSlug } = useParams({ strict: false });
  const { canUpdateOrganization, canDeleteOrganization } = usePermissions();
  const navigate = useNavigate();

  const { data: organization } = useSuspenseQuery(
    trpc.organization.getBySlug.queryOptions({
      organizationSlug: organizationSlug as string,
    })
  );

  const { mutateAsync: updateOrganization, isPending: isUpdating } =
    useMutation(
      trpc.organization.update.mutationOptions({
        onSuccess: (data) => {
          queryClient.invalidateQueries(trpc.organization.pathFilter());
          if (data.slug !== organizationSlug) {
            navigate({
              to: "/$organizationSlug/settings",
              params: { organizationSlug: data.slug },
              search: { tab: "general" },
            });
          }
        },
      })
    );

  const [
    { files: logoFiles, isDragging: isLogoDragging },
    {
      handleDragEnter: handleLogoDragEnter,
      handleDragLeave: handleLogoDragLeave,
      handleDragOver: handleLogoDragOver,
      handleDrop: handleLogoDrop,
      openFileDialog: openLogoDialog,
      getInputProps: getLogoInputProps,
    },
  ] = useFileUpload({
    multiple: false,
    maxFiles: 1,
    maxSize: 1024 * 1024 * 5,
    accept: "image/*",
  });

  const form = useForm({
    resolver: zodResolver(updateFormSchema),
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
    },
  });

  const hasNewLogo = logoFiles.length > 0 && logoFiles[0]?.file instanceof File;
  const logoPreview = logoFiles[0]?.preview;
  const currentLogo = organization.logo;

  const onSubmit = async (data: z.infer<typeof updateFormSchema>) => {
    try {
      let logoUrl: string | undefined;

      if (hasNewLogo && logoFiles[0]) {
        const file = logoFiles[0].file as File;
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const uploadError = await response.json();
          throw new Error(uploadError.error || "Failed to upload logo");
        }

        const { url } = await response.json();
        logoUrl = url;
      }

      await updateOrganization({
        organizationId: organization.id,
        name: data.name,
        slug: data.slug,
        ...(logoUrl !== undefined && { logo: logoUrl }),
      });
      toastManager.add({
        title: "Organization updated",
        description: "Your organization settings have been saved",
        type: "success",
      });
    } catch {
      toastManager.add({
        title: "Failed to update organization",
        description: "Please try again",
        type: "error",
      });
    }
  };

  const isDirty = form.formState.isDirty || hasNewLogo;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-12 min-h-12 items-center border-b bg-ui-bg-subtle px-4 py-2">
        <Text className="text-ui-fg-muted" size="xsmall">
          Organization name, slug, and other settings
        </Text>
      </div>
      <div className="flex flex-col">
        <Form {...form}>
          <form
            className="flex w-full flex-col gap-4 border-b p-4"
            id="org-general-settings-form"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="flex items-center gap-4">
              <Card
                className="flex size-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full p-0 transition-colors data-[dragging=true]:border-interactive"
                data-dragging={isLogoDragging || undefined}
                onClick={() => {
                  if (canUpdateOrganization) {
                    openLogoDialog();
                  }
                }}
                onDragEnter={handleLogoDragEnter}
                onDragLeave={handleLogoDragLeave}
                onDragOver={handleLogoDragOver}
                onDrop={handleLogoDrop}
              >
                <input
                  {...getLogoInputProps()}
                  aria-label="Upload organization logo"
                  className="sr-only"
                />
                {logoPreview || currentLogo ? (
                  <img
                    alt="Organization logo"
                    className="size-full rounded-full object-cover"
                    height={64}
                    src={logoPreview || currentLogo || ""}
                    width={64}
                  />
                ) : (
                  <RiBuilding2Fill className="size-5 text-ui-fg-muted" />
                )}
              </Card>
              <Text className="text-ui-fg-muted" size="xsmall">
                Click to upload a logo
              </Text>
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Organization Name</FormLabel>
                  <FormControl>
                    <Input
                      className="max-w-lg"
                      disabled={!canUpdateOrganization}
                      placeholder="My Organization"
                      {...field}
                    />
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
                      className="max-w-lg"
                      disabled={!canUpdateOrganization}
                      placeholder="my-organization"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-ui-fg-error" />
                </FormItem>
              )}
            />
            <PermissionTooltip
              hasPermission={canUpdateOrganization}
              side="right"
            >
              <LoadingButton
                className="self-start"
                disabled={!isDirty}
                form="org-general-settings-form"
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

        <DomainSection organizationId={organization.id} />

        <div className="w-full border-b p-4">
          <Text className="text-ui-fg-error" size="small" weight="plus">
            Danger Zone
          </Text>
          <Text className="mt-1 text-ui-fg-muted" size="xsmall">
            Deleting an organization is permanent and cannot be undone. All
            projects, flags, and data will be lost.
          </Text>
          <div className="mt-4">
            <PermissionTooltip
              hasPermission={canDeleteOrganization}
              message="You don't have permission to delete this organization"
              side="right"
            >
              <DeleteOrganizationButton
                organizationId={organization.id}
                organizationName={organization.name}
              />
            </PermissionTooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

function DomainSection({ organizationId }: { organizationId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { canUpdateOrganization } = usePermissions();

  const { data: domains } = useQuery(
    trpc.organizationDomain.list.queryOptions({ organizationId })
  );

  const { mutateAsync: removeDomain, isPending: isRemoving } = useMutation(
    trpc.organizationDomain.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.organizationDomain.list.queryOptions({ organizationId })
        );
      },
    })
  );

  if (!domains || domains.length === 0) {
    return null;
  }

  const handleRemove = async (domainId: string) => {
    try {
      await removeDomain({ domainId, organizationId });
      toastManager.add({
        title: "Domain removed",
        description: "The domain has been removed from this organization",
        type: "success",
      });
    } catch {
      toastManager.add({
        title: "Failed to remove domain",
        description: "Please try again",
        type: "error",
      });
    }
  };

  return (
    <div className="flex flex-col gap-3 border-b p-4">
      <div>
        <Text size="small" weight="plus">
          Associated Domain
        </Text>
        <Text className="mt-1 text-ui-fg-muted" size="xsmall">
          Users signing up with this email domain will be prompted to join your
          organization.
        </Text>
      </div>
      {domains.map((d) => (
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2"
          key={d.id}
        >
          <RiGlobeLine className="size-4 text-ui-fg-muted" />
          <Text className="flex-1" size="small">
            {d.domain}
          </Text>
          {canUpdateOrganization && (
            <Button
              disabled={isRemoving}
              onClick={() => handleRemove(d.id)}
              size="small"
              variant="ghost"
            >
              <RiCloseLine className="size-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function DeleteOrganizationButton({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutateAsync: deleteOrganization, isPending } = useMutation(
    trpc.organization.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.organization.pathFilter());
      },
    })
  );

  const handleDelete = async () => {
    try {
      await deleteOrganization({ organizationId });
      toastManager.add({
        title: "Organization deleted",
        description: `${organizationName} has been deleted`,
        type: "success",
      });
      setOpen(false);
      navigate({ to: "/" });
    } catch {
      toastManager.add({
        title: "Failed to delete organization",
        description: "Please try again",
        type: "error",
      });
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} size="small" variant="destructive">
        Delete organization
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
              Delete organization
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 p-4">
            <Text className="text-ui-fg-muted" size="small">
              This action cannot be undone. All projects, flags, environments,
              and evaluation data will be permanently deleted.
            </Text>
            <div className="flex flex-col gap-2">
              <Label className="text-xs">
                Type{" "}
                <Badge className="-mx-1 font-semibold" variant="outline">
                  {organizationName}
                </Badge>{" "}
                to confirm
              </Label>
              <Input
                onChange={(e) => setConfirmValue(e.target.value)}
                placeholder={organizationName}
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
              disabled={confirmValue !== organizationName}
              loading={isPending}
              onClick={handleDelete}
              size="small"
              variant="destructive"
            >
              Delete organization
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
