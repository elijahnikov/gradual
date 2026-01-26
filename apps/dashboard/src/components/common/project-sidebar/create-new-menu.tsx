import { Button } from "@gradual/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import { RiAddLine, RiFlagLine } from "@remixicon/react";
import { useState } from "react";
import CreateFlagDialog from "../dialogs/create-flag-dialog";

export default function CreateNewMenu() {
  const [isCreateFlagDialogOpen, setIsCreateFlagDialogOpen] =
    useState<boolean>(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              className="w-full justify-start text-left"
              size="small"
              variant="gradual"
            />
          }
        >
          <RiAddLine className="size-4" />
          Create new
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setIsCreateFlagDialogOpen(true)}>
            <RiFlagLine className="size-4" />
            Feature flag
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateFlagDialog
        onOpenChange={setIsCreateFlagDialogOpen}
        open={isCreateFlagDialogOpen}
      />
    </>
  );
}
