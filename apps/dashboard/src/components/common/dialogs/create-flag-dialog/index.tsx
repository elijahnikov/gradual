import { Button } from "@gradual/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@gradual/ui/dialog";
import CreateFlagForm from "./create-flag-form";

export default function CreateFlagDialog({
  children,
  open,
  onOpenChange,
}: {
  children?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      {children ? (
        <DialogTrigger render={<Button size="small" variant="gradual" />}>
          {children}
        </DialogTrigger>
      ) : null}
      <DialogContent className="relative top-8 flex min-h-[80vh] min-w-[70vw] flex-col">
        <DialogHeader>
          <DialogTitle className="font-medium text-[14px]">
            Create a new flag
          </DialogTitle>
        </DialogHeader>
        <CreateFlagForm isDialogOpen={open} />
      </DialogContent>
    </Dialog>
  );
}
