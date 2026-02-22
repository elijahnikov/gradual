import { Badge } from "@gradual/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import { Kbd } from "@gradual/ui/kbd";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Separator } from "@gradual/ui/separator";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import {
  RiBracesFill,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiGlobalLine,
} from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { m } from "motion/react";
import { useState } from "react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useSelectedFlagsStore } from "@/lib/stores/selected-flags-store";
import { useTRPC } from "@/lib/trpc";
import { getBaseUrl } from "@/lib/url";

export default function SelectedFlagsActions({
  organizationSlug,
  projectSlug,
}: {
  organizationSlug: string;
  projectSlug: string;
}) {
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const { selectedFlags, clearSelectedFlags } = useSelectedFlagsStore();
  const { canDeleteFlags } = usePermissions();

  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const { mutateAsync: deleteFlags } = useMutation(
    trpc.featureFlags.deleteFlags.mutationOptions({
      onSuccess: async () => {
        toastManager.add({
          title: `${selectedFlags.length} flag(s) deleted`,
          type: "success",
        });
        clearSelectedFlags();
        await queryClient.invalidateQueries(trpc.featureFlags.pathFilter());
      },
    })
  );

  const handleDeleteFlags = async () => {
    try {
      setActionLoading(true);
      await deleteFlags({
        organizationSlug,
        projectSlug,
        flagIds: selectedFlags.map((f) => f.id),
      });

      setDropdownOpen(false);
    } catch (error) {
      console.error(error);
      toastManager.add({
        title: `An error occured deleting ${selectedFlags.length} flags`,
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyFlagKeys = async () => {
    const flagKeys = selectedFlags.map((f) => f.key);
    const flagKeysString = flagKeys.join("\n");
    try {
      await navigator.clipboard.writeText(flagKeysString);
    } catch (error) {
      console.error(error);
      toastManager.add({
        title: "Failed to copy flag keys to clipboard",
        type: "error",
      });
    }
  };

  const handleCopyFlagUrls = async () => {
    const flagUrls = selectedFlags.map(
      (f) => `${getBaseUrl()}/${organizationSlug}/${projectSlug}/flags/${f.key}`
    );
    const flagUrlsString = flagUrls.join("\n");
    try {
      await navigator.clipboard.writeText(flagUrlsString);
    } catch (error) {
      console.error(error);
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
        onClick={clearSelectedFlags}
        variant="outline"
      >
        <Text>{selectedFlags.length} selected</Text> <Kbd>esc</Kbd>
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
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="txt-compact-small gap-x-2">
              <RiFileCopyLine className="size-4" />
              Copy
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={handleCopyFlagKeys}>
                <RiBracesFill className="size-3" />
                Copy flag keys
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyFlagUrls}>
                <RiGlobalLine className="size-3" />
                Copy flag URLs
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem
            className="text-ui-fg-error [&_svg]:text-ui-fg-error"
            disabled={!canDeleteFlags}
            onClick={handleDeleteFlags}
          >
            <RiDeleteBinLine className="size-3" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </m.div>
  );
}
