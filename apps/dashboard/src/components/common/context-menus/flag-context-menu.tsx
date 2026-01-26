import type { RouterOutputs } from "@gradual/api";
import { ContextMenu } from "@gradual/ui/context-menu";
import { RiArrowRightUpLine, RiDeleteBinLine } from "@remixicon/react";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import DeleteFlagDialog from "../dialogs/delete-flag-dialog";

export default function FlagContextMenu({
  children,
  flag,
}: {
  children: React.ReactNode;
  flag: RouterOutputs["featureFlags"]["getAll"]["items"][number]["featureFlag"];
}) {
  const { organizationSlug, projectSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/flags/",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
                params={{ organizationSlug, projectSlug, flagSlug: flag.key }}
                preload="intent"
                search={{}}
                to="/$organizationSlug/$projectSlug/flags/$flagSlug"
              />
            }
          >
            <RiArrowRightUpLine className="size-3" />
            Open
          </ContextMenu.Item>
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
        </ContextMenu.Content>
      </ContextMenu>
      <DeleteFlagDialog
        flag={flag}
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
      />
    </>
  );
}
