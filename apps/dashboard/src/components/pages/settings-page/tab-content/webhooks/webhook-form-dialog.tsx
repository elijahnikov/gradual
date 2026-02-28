import type { RouterOutputs } from "@gradual/api";
import { Button } from "@gradual/ui/button";
import CopyButton from "@gradual/ui/copy-button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@gradual/ui/dialog";
import { Input } from "@gradual/ui/input";
import { Label } from "@gradual/ui/label";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTRPC } from "@/lib/trpc";

type WebhookItem = RouterOutputs["webhooks"]["list"][number];

const ACTION_OPTIONS = [
  "create",
  "update",
  "delete",
  "archive",
  "restore",
  "publish",
  "unpublish",
] as const;

const RESOURCE_TYPE_OPTIONS = [
  "feature_flag",
  "environment",
  "segment",
  "project",
  "organization",
  "organization_member",
  "api_key",
  "snapshot",
  "webhook",
] as const;

interface WebhookFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook?: WebhookItem;
}

export default function WebhookFormDialog({
  open,
  onOpenChange,
  webhook,
}: WebhookFormDialogProps) {
  const isEditing = !!webhook;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { organizationSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/settings/",
  });

  const [name, setName] = useState(webhook?.name ?? "");
  const [url, setUrl] = useState(webhook?.url ?? "");
  const [selectedActions, setSelectedActions] = useState<string[]>(
    (webhook?.eventFilters as { actions: string[] } | null)?.actions ?? []
  );
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<string[]>(
    (webhook?.eventFilters as { resourceTypes: string[] } | null)
      ?.resourceTypes ?? []
  );
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const { mutateAsync: createWebhook, isPending: isCreating } = useMutation(
    trpc.webhooks.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.webhooks.pathFilter());
      },
    })
  );

  const { mutateAsync: updateWebhook, isPending: isUpdating } = useMutation(
    trpc.webhooks.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.webhooks.pathFilter());
      },
    })
  );

  const toggleAction = (action: string) => {
    setSelectedActions((prev) =>
      prev.includes(action)
        ? prev.filter((a) => a !== action)
        : [...prev, action]
    );
  };

  const toggleResourceType = (rt: string) => {
    setSelectedResourceTypes((prev) =>
      prev.includes(rt) ? prev.filter((r) => r !== rt) : [...prev, rt]
    );
  };

  const handleSubmit = async () => {
    try {
      if (isEditing) {
        await updateWebhook({
          organizationSlug,
          id: webhook.id,
          name,
          url,
          eventFilters: {
            actions: selectedActions,
            resourceTypes: selectedResourceTypes,
          },
        });
        toastManager.add({
          title: "Webhook updated",
          type: "success",
        });
        onOpenChange(false);
      } else {
        const result = await createWebhook({
          organizationSlug,
          name,
          url,
          eventFilters: {
            actions: selectedActions,
            resourceTypes: selectedResourceTypes,
          },
        });
        setCreatedSecret(result.signingSecret);
        toastManager.add({
          title: "Webhook created",
          description: "Copy your signing secret — it won't be shown again",
          type: "success",
        });
      }
    } catch (err) {
      toastManager.add({
        title: isEditing
          ? "Failed to update webhook"
          : "Failed to create webhook",
        description: err instanceof Error ? err.message : "Please try again",
        type: "error",
      });
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setCreatedSecret(null);
      if (!isEditing) {
        setName("");
        setUrl("");
        setSelectedActions([]);
        setSelectedResourceTypes([]);
      }
    }
    onOpenChange(open);
  };

  if (createdSecret) {
    return (
      <Dialog onOpenChange={handleClose} open={open}>
        <DialogContent className="flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-medium text-[14px]">
              Webhook Created
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 p-4">
            <Text className="text-ui-fg-muted" size="small">
              Copy your signing secret now. It will not be shown again.
            </Text>
            <div className="flex items-center gap-2 rounded-md border bg-ui-bg-field p-3">
              <code className="flex-1 break-all font-mono text-xs">
                {createdSecret}
              </code>
              <CopyButton text={createdSecret} />
            </div>
            <Text className="text-ui-fg-muted" size="xsmall">
              Use this secret to verify webhook signatures via the
              X-Gradual-Signature header (HMAC-SHA256).
            </Text>
          </div>
          <DialogFooter className="border-t p-4">
            <Button
              onClick={() => handleClose(false)}
              size="small"
              variant="gradual"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog onOpenChange={handleClose} open={open}>
      <DialogContent className="flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-medium text-[14px]">
            {isEditing ? "Edit Webhook" : "Add Webhook"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Name</Label>
            <Input
              onChange={(e) => setName(e.target.value)}
              placeholder="Slack notifications"
              value={name}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">URL</Label>
            <Input
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              type="url"
              value={url}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">
              Action Filters{" "}
              <span className="text-ui-fg-muted">(empty = all)</span>
            </Label>
            <div className="flex flex-wrap gap-1">
              {ACTION_OPTIONS.map((action) => (
                <Button
                  className="h-6 text-[10px]"
                  key={action}
                  onClick={() => toggleAction(action)}
                  size="small"
                  variant={
                    selectedActions.includes(action) ? "gradual" : "outline"
                  }
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">
              Resource Type Filters{" "}
              <span className="text-ui-fg-muted">(empty = all)</span>
            </Label>
            <div className="flex flex-wrap gap-1">
              {RESOURCE_TYPE_OPTIONS.map((rt) => (
                <Button
                  className="h-6 text-[10px]"
                  key={rt}
                  onClick={() => toggleResourceType(rt)}
                  size="small"
                  variant={
                    selectedResourceTypes.includes(rt) ? "gradual" : "outline"
                  }
                >
                  {rt.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="border-t p-4">
          <LoadingButton
            className="ml-auto"
            disabled={!(name.trim() && url.trim())}
            loading={isCreating || isUpdating}
            onClick={handleSubmit}
            size="small"
            variant="gradual"
          >
            {isEditing ? "Save changes" : "Create webhook"}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
