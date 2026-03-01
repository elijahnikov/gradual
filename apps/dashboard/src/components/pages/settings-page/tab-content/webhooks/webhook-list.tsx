import type { RouterOutputs } from "@gradual/api";
import { cn } from "@gradual/ui";
import { Badge } from "@gradual/ui/badge";
import { Checkbox } from "@gradual/ui/checkbox";
import { Separator } from "@gradual/ui/separator";
import { Text } from "@gradual/ui/text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import {
  RiCalendarLine,
  RiFlashlightLine,
  RiKey2Fill,
  RiLink,
} from "@remixicon/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import dayjs from "dayjs";
import { AnimatePresence, m } from "motion/react";
import React, { useCallback, useMemo, useState } from "react";
import WebhookContextMenu from "@/components/common/context-menus/webhook-context-menu";
import { useSelectedWebhooksStore } from "@/lib/stores/selected-webhooks-store";
import { useTRPC } from "@/lib/trpc";
import EmptyWebhooksList from "./empty-state";
import SelectedWebhooksActions from "./selected-webhooks-actions";
import WebhookDeliveryList from "./webhook-delivery-list";

type WebhookItem = RouterOutputs["webhooks"]["list"][number];

export default function WebhookList() {
  const trpc = useTRPC();
  const { organizationSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/settings/",
  });

  const { data: webhooks } = useSuspenseQuery(
    trpc.webhooks.list.queryOptions({ organizationSlug })
  );

  const { selectedWebhooks, setSelectedWebhooks, clearSelectedWebhooks } =
    useSelectedWebhooksStore();

  const handleSelectAll = useCallback(
    (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey
      ) {
        const target = event.target as HTMLElement;
        const isInputField =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;

        if (!isInputField) {
          event.preventDefault();
          const current = useSelectedWebhooksStore.getState().selectedWebhooks;
          const allSelected =
            webhooks.length > 0 &&
            webhooks.every((w) => current.some((s) => s.id === w.id));

          if (allSelected) {
            clearSelectedWebhooks();
          } else {
            setSelectedWebhooks(
              webhooks.map((w) => ({ id: w.id, name: w.name }))
            );
          }
        }
      }
    },
    [webhooks, setSelectedWebhooks, clearSelectedWebhooks]
  );

  const handleClearSelection = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (!isInputField && selectedWebhooks.length > 0) {
        event.preventDefault();
        clearSelectedWebhooks();
      }
    },
    [selectedWebhooks.length, clearSelectedWebhooks]
  );

  useHotkey("Mod+A", handleSelectAll);
  useHotkey("Escape", handleClearSelection);

  if (webhooks.length === 0) {
    return <EmptyWebhooksList />;
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {webhooks.map((webhook) => (
        <React.Fragment key={webhook.id}>
          <WebhookListItem webhook={webhook} />
          <Separator />
        </React.Fragment>
      ))}
      {selectedWebhooks.length > 0 && <SelectedWebhooksActions />}
    </div>
  );
}

function WebhookListItem({ webhook }: { webhook: WebhookItem }) {
  const [showDeliveries, setShowDeliveries] = useState(false);

  const selectedWebhooks = useSelectedWebhooksStore(
    (state) => state.selectedWebhooks
  );
  const setSelectedWebhooks = useSelectedWebhooksStore(
    (state) => state.setSelectedWebhooks
  );

  const handleSelectWebhook = useCallback(
    (webhookId: string) => {
      const current = useSelectedWebhooksStore.getState().selectedWebhooks;
      if (current.some((w) => w.id === webhookId)) {
        setSelectedWebhooks(current.filter((w) => w.id !== webhookId));
      } else {
        setSelectedWebhooks([
          ...current,
          { id: webhookId, name: webhook.name },
        ]);
      }
    },
    [setSelectedWebhooks, webhook.name]
  );

  const isSelected = useMemo(
    () => selectedWebhooks.some((w) => w.id === webhook.id),
    [selectedWebhooks, webhook.id]
  );

  const filters = webhook.eventFilters as {
    actions: string[];
    resourceTypes: string[];
  } | null;
  const hasFilters =
    filters && (filters.actions.length > 0 || filters.resourceTypes.length > 0);

  return (
    <WebhookContextMenu
      onToggleDeliveries={() => setShowDeliveries((prev) => !prev)}
      showDeliveries={showDeliveries}
      webhook={webhook}
    >
      <div
        className="group/webhook flex flex-col px-4 py-3 hover:bg-ui-bg-subtle-hover data-[selected=true]:bg-ui-button-recall/10"
        data-selected={isSelected}
      >
        <div className="flex items-center gap-3">
          {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: checkbox wrapper */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: checkbox wrapper */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: checkbox wrapper */}
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              className={cn(
                "opacity-0 transition-opacity duration-200 ease-in-out group-hover/webhook:opacity-100",
                isSelected && "opacity-100"
              )}
              onCheckedChange={() => handleSelectWebhook(webhook.id)}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <Text size="base" weight="plus">
                {webhook.name}
              </Text>
              {!webhook.enabled && (
                <Badge size="sm" variant="warning">
                  Disabled
                </Badge>
              )}
            </div>

            <TooltipProvider>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <RiLink className="size-4 text-ui-fg-muted" />
                  <Text className="font-mono text-ui-fg-muted" size="xsmall">
                    {new URL(webhook.url).hostname}
                  </Text>
                </div>

                <div className="flex items-center gap-1">
                  <RiKey2Fill className="size-4 text-ui-fg-muted" />
                  <Text className="font-mono text-ui-fg-muted" size="xsmall">
                    {webhook.signingSecret}
                  </Text>
                </div>

                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1">
                      <RiCalendarLine className="size-4 text-ui-fg-muted" />
                      <Text
                        className="font-mono text-ui-fg-muted"
                        size="xsmall"
                      >
                        {dayjs(webhook.createdAt).format("MMM D")}
                      </Text>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Created on {dayjs(webhook.createdAt).format("MMMM D, YYYY")}
                  </TooltipContent>
                </Tooltip>

                <div className="flex items-center gap-1">
                  <RiFlashlightLine className="size-4 text-ui-fg-muted" />
                  <div className="flex items-center gap-1">
                    {hasFilters ? (
                      <>
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
                      </>
                    ) : (
                      <Badge
                        className="text-[10px]"
                        size="sm"
                        variant="success"
                      >
                        All events
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </TooltipProvider>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {showDeliveries && (
            <m.div
              animate={{ height: "auto", opacity: 1 }}
              className="p-1"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              style={{ overflow: "hidden" }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <WebhookDeliveryList webhookId={webhook.id} />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </WebhookContextMenu>
  );
}
