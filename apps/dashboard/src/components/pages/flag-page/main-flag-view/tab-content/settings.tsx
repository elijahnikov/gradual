import type { RouterOutputs } from "@gradual/api";
import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import CopyButton from "@gradual/ui/copy-button";
import { Input } from "@gradual/ui/input";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Separator } from "@gradual/ui/separator";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { TooltipProvider } from "@gradual/ui/tooltip";
import {
  RiArchiveLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiInboxUnarchiveLine,
} from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import { type KeyboardEvent, useState } from "react";
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
      <div className="flex w-full flex-1 flex-col gap-4 px-5 py-3">
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

function _GeneralSection({ flag }: { flag: Flag }) {
  return (
    <Card className="flex flex-col p-0">
      <div className="p-3">
        <Text size="small" weight="plus">
          General
        </Text>
      </div>
      <Separator />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between">
          <Text className="text-ui-fg-muted" size="small">
            Key
          </Text>
          <div className="flex items-center gap-1">
            <Text className="font-mono text-xs">{flag.key}</Text>
            <CopyButton className="size-5 [&_svg]:size-3" text={flag.key} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Text className="text-ui-fg-muted" size="small">
            Type
          </Text>
          <Badge size="sm" variant="outline">
            {flag.type}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <Text className="text-ui-fg-muted" size="small">
            Created
          </Text>
          <Text size="xsmall" weight="plus">
            {dayjs(flag.createdAt).format("MMM D, YYYY")}
          </Text>
        </div>
        <div className="flex items-center justify-between">
          <Text className="text-ui-fg-muted" size="small">
            Last updated
          </Text>
          <Text size="xsmall" weight="plus">
            {dayjs(flag.updatedAt).format("MMM D, YYYY")}
          </Text>
        </div>
      </div>
    </Card>
  );
}

function _TagsSection({
  flag,
  organizationSlug,
  projectSlug,
}: {
  flag: Flag;
  organizationSlug: string;
  projectSlug: string;
}) {
  const [tags, setTags] = useState<string[]>(flag.tags ?? []);
  const [inputValue, setInputValue] = useState("");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateMutation = useMutation(
    trpc.featureFlags.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.featureFlags.getByKey.pathFilter()
        );
        toastManager.add({
          title: "Tags updated",
          type: "success",
        });
      },
      onError: () => {
        setTags(flag.tags ?? []);
        toastManager.add({
          title: "Failed to update tags",
          type: "error",
        });
      },
    })
  );

  const hasChanges = JSON.stringify(tags) !== JSON.stringify(flag.tags ?? []);

  const addTag = () => {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setInputValue("");
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const handleSave = () => {
    updateMutation.mutate({
      flagId: flag.id,
      projectSlug,
      organizationSlug,
      tags,
    });
  };

  return (
    <Card className="flex flex-col p-0">
      <div className="flex items-center justify-between p-3">
        <Text size="small" weight="plus">
          Tags
        </Text>
        {hasChanges && (
          <LoadingButton
            loading={updateMutation.isPending}
            onClick={handleSave}
            size="small"
          >
            Save
          </LoadingButton>
        )}
      </div>
      <Separator />
      <div className="flex flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center gap-1">
          {tags.map((tag) => (
            <Badge className="gap-x-1" key={tag} variant="outline">
              {tag}
              <button
                className="text-ui-fg-muted transition-colors hover:text-ui-fg-base"
                onClick={() => removeTag(tag)}
                type="button"
              >
                <RiCloseLine className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Input
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a tag and press Enter"
          size="small"
          value={inputValue}
        />
      </div>
    </Card>
  );
}

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
    <Card className="flex flex-col border-destructive/40 p-0">
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
    </Card>
  );
}
