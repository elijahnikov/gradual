import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import CopyButton from "@gradual/ui/copy-button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@gradual/ui/dialog";
import { Input } from "@gradual/ui/input";
import { Label } from "@gradual/ui/label";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { RiAlertLine, RiCheckLine } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "@/lib/trpc";

interface CreateApiKeyDialogProps {
  children?: React.ReactNode;
  open: boolean;
  organizationId: string;
  projectId: string;
  onOpenChange: (open: boolean) => void;
}

export default function CreateApiKeyDialog({
  children,
  open,
  organizationId,
  projectId,
  onOpenChange,
}: CreateApiKeyDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const { mutate: create, isPending } = useMutation(
    trpc.apiKey.create.mutationOptions({
      onSuccess: (data) => {
        setCreatedKey(data.key);
        queryClient.invalidateQueries(
          trpc.apiKey.listByOrganizationIdAndProjectId.pathFilter()
        );
      },
      onError: () => {
        toastManager.add({ title: "Failed to create API key", type: "error" });
      },
    })
  );

  const handleClose = () => {
    setName("");
    setCreatedKey(null);
    onOpenChange(false);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      return;
    }
    create({
      name: name.trim(),
      organizationId,
      projectId,
      environmentIds: [],
    });
  };

  return (
    <Dialog
      onOpenChange={(isOpen) => {
        if (isOpen) {
          onOpenChange(true);
        } else {
          handleClose();
        }
      }}
      open={open}
    >
      {children ? (
        <DialogTrigger
          render={
            <Button className="h-6! min-h-6!" size="small" variant="outline" />
          }
        >
          {children}
        </DialogTrigger>
      ) : null}

      <DialogContent className="max-w-md">
        {createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RiCheckLine className="size-4 text-green-600" />
                API key created
              </DialogTitle>
            </DialogHeader>
            <div className="my-4 flex flex-col gap-4 px-4 pb-2">
              <div className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800 dark:bg-amber-950">
                <RiAlertLine className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <Text
                  className="text-amber-800 dark:text-amber-200"
                  size="xsmall"
                >
                  Copy this key now — it won't be shown again. Store it
                  somewhere secure.
                </Text>
              </div>
              <Card className="flex items-center gap-2 bg-ui-bg-base">
                <code className="flex-1 break-all font-mono text-ui-fg-base text-xs">
                  {createdKey}
                </code>
                <div>
                  <CopyButton text={createdKey} />
                </div>
              </Card>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} size="small">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-medium text-[14px]">
                Create API key
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 flex flex-col gap-4 px-4 pb-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="api-key-name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="api-key-name"
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim()) {
                      handleCreate();
                    }
                  }}
                  placeholder="e.g. Production server, CI pipeline"
                  value={name}
                />
                <Text className="text-ui-fg-muted" size="xsmall">
                  A descriptive name to identify where this key is used.
                </Text>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} size="small" variant="outline">
                Cancel
              </Button>
              <LoadingButton
                disabled={!name.trim()}
                loading={isPending}
                onClick={handleCreate}
                size="small"
              >
                Create key
              </LoadingButton>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
