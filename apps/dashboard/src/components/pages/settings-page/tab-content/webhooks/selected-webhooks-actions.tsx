import { Badge } from "@gradual/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import { Kbd } from "@gradual/ui/kbd";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Separator } from "@gradual/ui/separator";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { RiDeleteBinLine, RiLink } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { m } from "motion/react";
import { useState } from "react";
import { useSelectedWebhooksStore } from "@/lib/stores/selected-webhooks-store";
import { useTRPC } from "@/lib/trpc";

export default function SelectedWebhooksActions() {
  const [actionLoading, setActionLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { selectedWebhooks, clearSelectedWebhooks } =
    useSelectedWebhooksStore();

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { organizationSlug } = useParams({ strict: false });

  const { mutateAsync: deleteWebhook } = useMutation(
    trpc.webhooks.delete.mutationOptions()
  );

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await Promise.all(
        selectedWebhooks.map((w) =>
          deleteWebhook({
            organizationSlug: organizationSlug as string,
            id: w.id,
          })
        )
      );
      toastManager.add({
        title: `${selectedWebhooks.length} webhook(s) deleted`,
        type: "success",
      });
      clearSelectedWebhooks();
      await queryClient.invalidateQueries(trpc.webhooks.pathFilter());
      setDropdownOpen(false);
    } catch (error) {
      console.error(error);
      toastManager.add({
        title: `Failed to delete ${selectedWebhooks.length} webhook(s)`,
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyNames = async () => {
    const names = selectedWebhooks.map((w) => w.name);
    try {
      await navigator.clipboard.writeText(names.join("\n"));
      toastManager.add({ title: "Webhook names copied", type: "success" });
    } catch (error) {
      console.error(error);
      toastManager.add({
        title: "Failed to copy to clipboard",
        type: "error",
      });
    }
  };

  return (
    <m.div
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="absolute bottom-14 left-1/2 flex h-12 w-max -translate-x-1/2 items-center justify-center gap-x-2 rounded-md bg-ui-bg-component px-2 shadow-elevation-tooltip"
      initial={{
        opacity: 0,
        y: 20,
      }}
      transition={{
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <Badge
        className="flex h-8! w-max cursor-pointer items-center gap-2 px-2"
        onClick={clearSelectedWebhooks}
        variant="outline"
      >
        <Text>{selectedWebhooks.length} selected</Text> <Kbd>esc</Kbd>
      </Badge>
      <Separator orientation="vertical" />
      <DropdownMenu
        onOpenChange={(open) => {
          if (!actionLoading) {
            setDropdownOpen(open);
          }
        }}
        open={dropdownOpen || actionLoading}
      >
        <DropdownMenuTrigger
          render={
            <LoadingButton
              className="text-white!"
              loading={actionLoading}
              size="small"
              variant="gradual"
            />
          }
        >
          Actions
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="relative bottom-1.5"
          side="top"
          sideOffset={8}
        >
          <DropdownMenuItem onClick={handleCopyNames}>
            <RiLink className="size-3" />
            Copy names
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-ui-fg-error [&_svg]:text-ui-fg-error"
            onClick={handleDelete}
          >
            <RiDeleteBinLine className="size-3" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </m.div>
  );
}
