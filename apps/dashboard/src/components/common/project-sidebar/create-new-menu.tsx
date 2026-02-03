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
import CreateEnvironmentDialog from "../dialogs/create-environment-dialog";
import CreateFlagDialog from "../dialogs/create-flag-dialog";

export default function CreateNewMenu() {
  const [isCreateFlagDialogOpen, setIsCreateFlagDialogOpen] =
    useState<boolean>(false);
  const [isCreateEnvironmentDialogOpen, setIsCreateEnvironmentDialogOpen] =
    useState<boolean>(false);

  return (
    <>
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
          <DropdownMenuItem onClick={() => setIsCreateFlagDialogOpen(true)}>
            <RiFlagLine className="size-4" />
            Feature flag
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsCreateEnvironmentDialogOpen(true)}
          >
            <RiEarthFill className="size-4" />
            Environment
          </DropdownMenuItem>
          <DropdownMenuItem>
            <RiDonutChartFill className="size-4" />
            Segment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
