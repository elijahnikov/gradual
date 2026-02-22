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
import { useSelectedSegmentsStore } from "@/lib/stores/selected-segments-store";
import { getBaseUrl } from "@/lib/url";

export default function SelectedSegmentsActions({
  organizationSlug,
  projectSlug,
}: {
  organizationSlug: string;
  projectSlug: string;
}) {
  const { selectedSegments, clearSelectedSegments } =
    useSelectedSegmentsStore();

  const handleCopySegmentKeys = async () => {
    const keys = selectedSegments.map((s) => s.key).join("\n");
    try {
      await navigator.clipboard.writeText(keys);
    } catch (error) {
      console.error(error);
      toastManager.add({
        title: "Failed to copy segment keys to clipboard",
        type: "error",
      });
    }
  };

  const handleCopySegmentUrls = async () => {
    const urls = selectedSegments.map(
      (s) =>
        `${getBaseUrl()}/${organizationSlug}/${projectSlug}/segments/${s.key}`
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
        onClick={clearSelectedSegments}
        variant="outline"
      >
        <Text>{selectedSegments.length} selected</Text> <Kbd>esc</Kbd>
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
              <DropdownMenuItem onClick={handleCopySegmentKeys}>
                <RiBracesFill className="size-3" />
                Copy segment keys
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopySegmentUrls}>
                <RiGlobalLine className="size-3" />
                Copy segment URLs
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </m.div>
  );
}
