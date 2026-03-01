import { ContextMenu } from "@gradual/ui/context-menu";
import { toastManager } from "@gradual/ui/toast";
import {
  RiArrowRightUpLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiLink,
} from "@remixicon/react";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import DeleteSegmentDialog from "../dialogs/delete-segment-dialog";

export default function SegmentContextMenu({
  children,
  segment,
}: {
  children: React.ReactNode;
  segment: { id: string; name: string; key: string };
}) {
  const { organizationSlug, projectSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/segments/",
  });
  const { canDeleteSegments } = usePermissions();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(segment.key);
    toastManager.add({ title: "Segment key copied", type: "success" });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/${organizationSlug}/${projectSlug}/segments/${segment.key}`;
    navigator.clipboard.writeText(url);
    toastManager.add({ title: "Link copied", type: "success" });
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
            render={
              <Link
                params={{
                  organizationSlug,
                  projectSlug,
                  segmentSlug: segment.key,
                }}
                preload="intent"
                search={{}}
                to="/$organizationSlug/$projectSlug/segments/$segmentSlug"
              />
            }
          >
            <RiArrowRightUpLine className="size-3" />
            Open
          </ContextMenu.Item>
          <ContextMenu.Item onClick={handleCopyKey}>
            <RiFileCopyLine className="size-3" />
            Copy key
          </ContextMenu.Item>
          <ContextMenu.Item onClick={handleCopyLink}>
            <RiLink className="size-3" />
            Copy link
          </ContextMenu.Item>
          {canDeleteSegments && (
            <>
              <ContextMenu.Separator />
              <ContextMenu.Item
                className="text-ui-fg-error [&_svg]:text-ui-fg-error"
                onClick={(e) => {
                  e.preventDefault();
                  setDeleteDialogOpen(true);
                }}
              >
                <RiDeleteBinLine className="size-3" />
                Delete
              </ContextMenu.Item>
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu>
      <DeleteSegmentDialog
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
        segment={segment}
      />
    </>
  );
}
