import { Button } from "@gradual/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@gradual/ui/dialog";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTRPC } from "@/lib/trpc";

interface DeleteFlagDialogProps {
  children?: React.ReactNode;
  flag: {
    id: string;
    name: string;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function DeleteFlagDialog({
  children,
  flag,
  open,
  onOpenChange,
}: DeleteFlagDialogProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { organizationSlug, projectSlug } = useParams({ strict: false });

  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const { mutateAsync: deleteFlags } = useMutation(
    trpc.featureFlags.deleteFlags.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.featureFlags.pathFilter());
      },
    })
  );

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteFlags({
        flagIds: [flag.id],
        organizationSlug: organizationSlug as string,
        projectSlug: projectSlug as string,
      });
      toastManager.add({
        title: "Flag deleted",
        type: "success",
      });
      onOpenChange?.(false);
    } catch (error) {
      console.error(error);
      toastManager.add({
        title: "Failed to delete flag",
        type: "error",
      });
    } finally {
      onOpenChange?.(false);
      setIsLoading(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      {children && <DialogTrigger render={() => <>{children}</>} />}
      <DialogContent className="max-w-96">
        <DialogHeader>
          <DialogTitle className="text-md">Delete flag</DialogTitle>
        </DialogHeader>

        <div className="p-4">
          <Text size="small" weight="plus">
            Are you sure you want to delete "{flag.name}"?
          </Text>
          <Text className="text-ui-fg-muted" size="small">
            This action cannot be undone.
          </Text>
        </div>
        <DialogFooter className="flex items-center gap-2">
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <LoadingButton
            className="w-full text-white!"
            loading={isLoading}
            onClick={handleDelete}
            variant="destructive"
          >
            Delete
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
