import type { RouterOutputs } from "@gradual/api";
import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import CopyButton from "@gradual/ui/copy-button";
import { Separator } from "@gradual/ui/separator";
import { Switch } from "@gradual/ui/switch";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import {
  RiDeleteBinLine,
  RiEditLine,
  RiFlashlightLine,
  RiWebhookLine,
} from "@remixicon/react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import React, { useState } from "react";
import { useTRPC } from "@/lib/trpc";
import WebhookDeliveryList from "./webhook-delivery-list";
import WebhookFormDialog from "./webhook-form-dialog";

type WebhookItem = RouterOutputs["webhooks"]["list"][number];

export default function WebhookList() {
  const trpc = useTRPC();
  const { organizationSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/settings/",
  });

  const { data: webhooks } = useSuspenseQuery(
    trpc.webhooks.list.queryOptions({ organizationSlug })
  );

  if (webhooks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-ui-fg-muted">
        <RiWebhookLine className="size-8 text-ui-fg-muted/50" />
        <Text size="small">No webhooks configured</Text>
        <Text className="text-ui-fg-muted" size="xsmall">
          Add a webhook to receive real-time audit log notifications
        </Text>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {webhooks.map((webhook) => (
        <React.Fragment key={webhook.id}>
          <WebhookListItem webhook={webhook} />
          <Separator />
        </React.Fragment>
      ))}
    </div>
  );
}

function WebhookListItem({ webhook }: { webhook: WebhookItem }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { organizationSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/settings/",
  });

  const [editOpen, setEditOpen] = useState(false);
  const [showDeliveries, setShowDeliveries] = useState(false);

  const { mutate: toggleEnabled } = useMutation(
    trpc.webhooks.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.webhooks.pathFilter());
      },
    })
  );

  const { mutate: deleteWebhook, isPending: isDeleting } = useMutation(
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

  const { mutate: testWebhook, isPending: isTesting } = useMutation(
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

  const filters = webhook.eventFilters as {
    actions: string[];
    resourceTypes: string[];
  } | null;
  const hasFilters =
    filters && (filters.actions.length > 0 || filters.resourceTypes.length > 0);

  return (
    <>
      <div className="flex flex-col gap-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <Switch
            checked={webhook.enabled}
            onCheckedChange={(checked) =>
              toggleEnabled({
                organizationSlug,
                id: webhook.id,
                enabled: checked,
              })
            }
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Text size="small" weight="plus">
                {webhook.name}
              </Text>
              {!webhook.enabled && (
                <Badge size="sm" variant="warning">
                  Disabled
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Text
                className="max-w-sm truncate font-mono text-ui-fg-muted"
                size="xsmall"
              >
                {webhook.url}
              </Text>
              <CopyButton
                className="size-3.5 shrink-0 [&_svg]:size-2.5"
                text={webhook.url}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {hasFilters ? (
              <div className="flex items-center gap-1">
                {filters.actions.map((a) => (
                  <Badge
                    className="text-[10px]"
                    key={a}
                    size="sm"
                    variant="info"
                  >
                    {a}
                  </Badge>
                ))}
                {filters.resourceTypes.map((r) => (
                  <Badge
                    className="text-[10px]"
                    key={r}
                    size="sm"
                    variant="default"
                  >
                    {r}
                  </Badge>
                ))}
              </div>
            ) : (
              <Badge className="text-[10px]" size="sm" variant="success">
                All events
              </Badge>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              disabled={isTesting}
              onClick={() => testWebhook({ organizationSlug, id: webhook.id })}
              size="small"
              variant="outline"
            >
              <RiFlashlightLine className="size-3.5" />
              <span className="text-xs">{isTesting ? "Testing…" : "Test"}</span>
            </Button>
            <Button
              onClick={() => setEditOpen(true)}
              size="small"
              variant="outline"
            >
              <RiEditLine className="size-3.5" />
            </Button>
            <Button
              disabled={isDeleting}
              onClick={() =>
                deleteWebhook({ organizationSlug, id: webhook.id })
              }
              size="small"
              variant="outline"
            >
              <RiDeleteBinLine className="size-3.5 text-ui-fg-error" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Text className="font-mono text-ui-fg-muted" size="xsmall">
            Secret: {webhook.signingSecret}
          </Text>
          <Button
            className="h-5 text-[10px]"
            onClick={() => setShowDeliveries(!showDeliveries)}
            size="small"
            variant="ghost"
          >
            {showDeliveries ? "Hide deliveries" : "Show deliveries"}
          </Button>
        </div>

        {showDeliveries && <WebhookDeliveryList webhookId={webhook.id} />}
      </div>

      <WebhookFormDialog
        onOpenChange={setEditOpen}
        open={editOpen}
        webhook={webhook}
      />
    </>
  );
}
