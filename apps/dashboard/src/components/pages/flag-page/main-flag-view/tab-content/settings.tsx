import type { RouterOutputs } from "@gradual/api";
import { Button } from "@gradual/ui/button";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Separator } from "@gradual/ui/separator";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { TooltipProvider } from "@gradual/ui/tooltip";
import {
  RiArchiveLine,
  RiDeleteBinLine,
  RiInboxUnarchiveLine,
} from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import DeleteFlagDialog from "@/components/common/dialogs/delete-flag-dialog";
import { PermissionTooltip } from "@/components/common/permission-tooltip";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useTRPC } from "@/lib/trpc";

type FlagData = RouterOutputs["featureFlags"]["getByKey"];

interface FlagSettingsProps {
  flag: FlagData;
  organizationSlug: string;
  projectSlug: string;
}

export default function FlagSettings({
  flag,
  organizationSlug,
  projectSlug,
}: FlagSettingsProps) {
  const { flag: flagData } = flag;

  return (
    <TooltipProvider>
      <div className="flex w-full flex-col gap-4 border-b">
        <DangerZone
          flag={flagData}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
        />
      </div>
    </TooltipProvider>
  );
}

type Flag = FlagData["flag"];

function DangerZone({
  flag,
  organizationSlug,
  projectSlug,
}: {
  flag: Flag;
  organizationSlug: string;
  projectSlug: string;
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { canUpdateFlags, canDeleteFlags } = usePermissions();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isArchived = flag.status === "archived";

  const archiveMutation = useMutation(
    trpc.featureFlags.archiveFlag.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.featureFlags.getByKey.pathFilter()
        );
        toastManager.add({
          title: isArchived ? "Flag unarchived" : "Flag archived",
          type: "success",
        });
      },
      onError: () => {
        toastManager.add({
          title: isArchived
            ? "Failed to unarchive flag"
            : "Failed to archive flag",
          type: "error",
        });
      },
    })
  );

  const handleArchiveToggle = () => {
    archiveMutation.mutate({
      flagId: flag.id,
      projectSlug,
      organizationSlug,
      archive: !isArchived,
    });
  };

  return (
    <div className="flex flex-col border-destructive/40 p-0">
      <div className="p-3">
        <Text size="base" weight="plus">
          Danger zone
        </Text>
      </div>
      <Separator />
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-3">
          <div className="flex flex-col gap-0.5">
            <Text size="small" weight="plus">
              {isArchived ? "Unarchive this flag" : "Archive this flag"}
            </Text>
            <Text className="text-ui-fg-muted" size="xsmall">
              {isArchived
                ? "Restore this flag to active status."
                : "Mark this flag as archived. It will no longer be evaluated by SDKs."}
            </Text>
          </div>
          <PermissionTooltip
            hasPermission={canUpdateFlags}
            message="You don't have permission to archive flags"
          >
            <LoadingButton
              loading={archiveMutation.isPending}
              onClick={handleArchiveToggle}
              size="small"
              variant="outline"
            >
              {isArchived ? (
                <RiInboxUnarchiveLine className="size-4" />
              ) : (
                <RiArchiveLine className="size-4" />
              )}
              {isArchived ? "Unarchive" : "Archive"}
            </LoadingButton>
          </PermissionTooltip>
        </div>
        <Separator />
        <div className="flex items-center justify-between p-3">
          <div className="flex flex-col gap-0.5">
            <Text size="small" weight="plus">
              Delete this flag
            </Text>
            <Text className="text-ui-fg-muted" size="xsmall">
              Permanently delete this flag and all its data. This cannot be
              undone.
            </Text>
          </div>
          <PermissionTooltip
            hasPermission={canDeleteFlags}
            message="You don't have permission to delete flags"
          >
            <Button
              onClick={() => setDeleteDialogOpen(true)}
              size="small"
              variant="destructive"
            >
              <RiDeleteBinLine className="size-4" />
              Delete
            </Button>
          </PermissionTooltip>
        </div>
      </div>
      <DeleteFlagDialog
        flag={flag}
        onDeleted={() => {
          navigate({
            to: "/$organizationSlug/$projectSlug/flags",
            params: { organizationSlug, projectSlug },
          });
        }}
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
      />
    </div>
  );
}
