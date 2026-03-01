import type { RouterOutputs } from "@gradual/api";
import { ContextMenu } from "@gradual/ui/context-menu";
import { toastManager } from "@gradual/ui/toast";
import {
  RiDeleteBinLine,
  RiEditLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFlashlightLine,
  RiLink,
  RiToggleLine,
} from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useTRPC } from "@/lib/trpc";
import WebhookFormDialog from "../../pages/settings-page/tab-content/webhooks/webhook-form-dialog";

type WebhookItem = RouterOutputs["webhooks"]["list"][number];

interface WebhookContextMenuProps {
  children: React.ReactNode;
  webhook: WebhookItem;
  onToggleDeliveries?: () => void;
  showDeliveries?: boolean;
}

export default function WebhookContextMenu({
  children,
  webhook,
  onToggleDeliveries,
  showDeliveries,
}: WebhookContextMenuProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { organizationSlug } = useParams({ strict: false });
  const { canManageWebhooks } = usePermissions();
  const [editOpen, setEditOpen] = useState(false);

  const { mutate: toggleEnabled } = useMutation(
    trpc.webhooks.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.webhooks.pathFilter());
      },
    })
  );

  const { mutate: testWebhook } = useMutation(
    trpc.webhooks.test.mutationOptions({
      onSuccess: (result) => {
        queryClient.invalidateQueries(trpc.webhooks.pathFilter());
        if (result.success) {
          toastManager.add({
            title: "Test successful",
            description: `Status ${result.responseStatus} in ${result.durationMs}ms`,
            type: "success",
          });
        } else {
          toastManager.add({
            title: "Test failed",
            description: result.error ?? `Status ${result.responseStatus}`,
            type: "error",
          });
        }
      },
      onError: (err) => {
        toastManager.add({
          title: "Test failed",
          description: err.message,
          type: "error",
        });
      },
    })
  );

  const { mutate: deleteWebhook } = useMutation(
    trpc.webhooks.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.webhooks.pathFilter());
        toastManager.add({
          title: "Webhook deleted",
          type: "success",
        });
      },
    })
  );

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhook.url);
    toastManager.add({ title: "URL copied", type: "success" });
  };

  return (
    <>
      <ContextMenu>
        <ContextMenu.Trigger className="border-0!">
          {children}
        </ContextMenu.Trigger>
        <ContextMenu.Content
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.stopPropagation()}
        >
          <ContextMenu.Item
            disabled={!canManageWebhooks}
            onClick={() =>
              testWebhook({
                organizationSlug: organizationSlug as string,
                id: webhook.id,
              })
            }
          >
            <RiFlashlightLine className="size-3" />
            Test
          </ContextMenu.Item>
          <ContextMenu.Item
            disabled={!canManageWebhooks}
            onClick={(e) => {
              e.preventDefault();
              setEditOpen(true);
            }}
          >
            <RiEditLine className="size-3" />
            Edit
          </ContextMenu.Item>
          <ContextMenu.Item onClick={handleCopyUrl}>
            <RiLink className="size-3" />
            Copy URL
          </ContextMenu.Item>
          <ContextMenu.Item
            disabled={!canManageWebhooks}
            onClick={() =>
              toggleEnabled({
                organizationSlug: organizationSlug as string,
                id: webhook.id,
                enabled: !webhook.enabled,
              })
            }
          >
            <RiToggleLine className="size-3" />
            {webhook.enabled ? "Disable" : "Enable"}
          </ContextMenu.Item>
          {onToggleDeliveries && (
            <>
              <ContextMenu.Separator />
              <ContextMenu.Item onClick={onToggleDeliveries}>
                {showDeliveries ? (
                  <RiEyeOffLine className="size-3" />
                ) : (
                  <RiEyeLine className="size-3" />
                )}
                {showDeliveries ? "Hide deliveries" : "Show deliveries"}
              </ContextMenu.Item>
            </>
          )}
          <ContextMenu.Separator />
          <ContextMenu.Item
            className="text-ui-fg-error [&_svg]:text-ui-fg-error"
            disabled={!canManageWebhooks}
            onClick={() =>
              deleteWebhook({
                organizationSlug: organizationSlug as string,
                id: webhook.id,
              })
            }
          >
            <RiDeleteBinLine className="size-3" />
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>
      <WebhookFormDialog
        onOpenChange={setEditOpen}
        open={editOpen}
        webhook={webhook}
      />
    </>
  );
}
