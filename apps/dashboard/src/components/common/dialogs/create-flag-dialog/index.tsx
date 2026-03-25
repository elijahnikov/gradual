import { Button } from "@gradual/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@gradual/ui/dialog";
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
        <DialogTrigger
          render={
            <Button className="h-6! min-h-6!" size="small" variant="outline" />
          }
        >
          {children}
        </DialogTrigger>
      ) : null}
      <DialogContent className="relative top-8 flex min-h-[80vh] min-w-[70vw] flex-col">
        <CreateFlagForm isDialogOpen={open} />
      </DialogContent>
    </Dialog>
  );
}
