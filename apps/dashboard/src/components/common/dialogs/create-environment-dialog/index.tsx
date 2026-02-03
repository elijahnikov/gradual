import { Button } from "@gradual/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@gradual/ui/dialog";
import CreateEnvironmentForm from "./create-environment-form";

export default function CreateEnvironmentDialog({
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
      <DialogContent className="flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-medium text-[14px]">
            Create a new environment
          </DialogTitle>
        </DialogHeader>
        <CreateEnvironmentForm />
      </DialogContent>
    </Dialog>
  );
}
