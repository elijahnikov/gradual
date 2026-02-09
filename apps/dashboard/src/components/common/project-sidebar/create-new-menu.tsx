import { Button } from "@gradual/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import {
  RiAddLine,
  RiDonutChartFill,
  RiEarthFill,
  RiFlagLine,
} from "@remixicon/react";
import { useState } from "react";
import { PermissionTooltip } from "@/components/common/permission-tooltip";
import { usePermissions } from "@/lib/hooks/use-permissions";
import CreateEnvironmentDialog from "../dialogs/create-environment-dialog";
import CreateFlagDialog from "../dialogs/create-flag-dialog";

export default function CreateNewMenu() {
  const {
    canCreateFlags,
    canCreateEnvironments,
    canCreateSegments,
    isLoading,
  } = usePermissions();
  const [isCreateFlagDialogOpen, setIsCreateFlagDialogOpen] =
    useState<boolean>(false);
  const [isCreateEnvironmentDialogOpen, setIsCreateEnvironmentDialogOpen] =
    useState<boolean>(false);

  return (
    <>
      <PermissionTooltip
        hasPermission={
          !isLoading &&
          (canCreateFlags || canCreateEnvironments || canCreateSegments)
        }
        message="You don't have permission to create resources"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                className="h-7 w-full justify-start text-left"
                size="small"
                variant="gradual"
              />
            }
          >
            <RiAddLine className="size-4" />
            Create new
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right">
            <DropdownMenuItem
              disabled={!canCreateFlags}
              onClick={() => setIsCreateFlagDialogOpen(true)}
            >
              <RiFlagLine className="size-4" />
              Feature flag
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canCreateEnvironments}
              onClick={() => setIsCreateEnvironmentDialogOpen(true)}
            >
              <RiEarthFill className="size-4" />
              Environment
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canCreateSegments}>
              <RiDonutChartFill className="size-4" />
              Segment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PermissionTooltip>
      <CreateFlagDialog
        onOpenChange={setIsCreateFlagDialogOpen}
        open={isCreateFlagDialogOpen}
      />
      <CreateEnvironmentDialog
        onOpenChange={setIsCreateEnvironmentDialogOpen}
        open={isCreateEnvironmentDialogOpen}
      />
    </>
  );
}
