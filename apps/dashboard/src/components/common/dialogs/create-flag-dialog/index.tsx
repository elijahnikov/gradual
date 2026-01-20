import { Button } from "@gradual/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@gradual/ui/dialog";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import CreateFlagForm from "./create-flag-form";

export default function CreateFlagDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useHotkeys("meta+j", () => {
    setIsOpen(true);
  });

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger render={<Button size="small" variant="gradual" />}>
        {children}
      </DialogTrigger>
      <DialogContent className="flex min-h-[80vh] min-w-[50vw] flex-col">
        <DialogHeader>
          <DialogTitle className="font-medium text-md">
            Create a new flag
          </DialogTitle>
        </DialogHeader>
        <CreateFlagForm />
      </DialogContent>
    </Dialog>
  );
}
