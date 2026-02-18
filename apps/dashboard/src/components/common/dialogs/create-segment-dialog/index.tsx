import { Button } from "@gradual/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@gradual/ui/dialog";
import CreateSegmentForm from "./create-segment-form";

export default function CreateSegmentDialog({
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
      <DialogContent className="flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-medium text-[14px]">
            Create a new segment
          </DialogTitle>
        </DialogHeader>
        <CreateSegmentForm onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
