import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
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
import { Separator } from "@gradual/ui/separator";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { RiBracesFill, RiFileCopyLine, RiGlobalLine } from "@remixicon/react";
import { m } from "motion/react";
import { useSelectedEnvironmentsStore } from "@/lib/stores/selected-environments-store";
import { getBaseUrl } from "@/lib/url";

export default function SelectedEnvironmentsActions({
  organizationSlug,
  projectSlug,
}: {
  organizationSlug: string;
  projectSlug: string;
}) {
  const { selectedEnvironments, clearSelectedEnvironments } =
    useSelectedEnvironmentsStore();

  const handleCopySlugs = async () => {
    const slugs = selectedEnvironments.map((e) => e.slug).join("\n");
    try {
      await navigator.clipboard.writeText(slugs);
    } catch (error) {
      console.error(error);
      toastManager.add({
        title: "Failed to copy environment slugs to clipboard",
        type: "error",
      });
    }
  };

  const handleCopyUrls = async () => {
    const urls = selectedEnvironments.map(
      (e) =>
        `${getBaseUrl()}/${organizationSlug}/${projectSlug}/environments/${e.slug}`
    );
    const urlsString = urls.join("\n");
    try {
      await navigator.clipboard.writeText(urlsString);
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
        onClick={clearSelectedEnvironments}
        variant="outline"
      >
        <Text>{selectedEnvironments.length} selected</Text> <Kbd>esc</Kbd>
      </Badge>
      <Separator orientation="vertical" />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button className="text-white!" size="small" variant="gradual" />
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
              <DropdownMenuItem onClick={handleCopySlugs}>
                <RiBracesFill className="size-3" />
                Copy environment slugs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyUrls}>
                <RiGlobalLine className="size-3" />
                Copy environment URLs
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </m.div>
  );
}
