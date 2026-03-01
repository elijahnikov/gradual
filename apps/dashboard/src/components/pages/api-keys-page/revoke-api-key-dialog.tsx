import type { RouterOutputs } from "@gradual/api";
import { Button } from "@gradual/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@gradual/ui/dialog";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";

type ApiKey =
  RouterOutputs["apiKey"]["listByOrganizationIdAndProjectId"][number];

interface RevokeApiKeyDialogProps {
  apiKey: ApiKey | null;
  organizationId: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RevokeApiKeyDialog({
  apiKey,
  organizationId,
  projectId,
  open,
  onOpenChange,
}: RevokeApiKeyDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const queryKey = trpc.apiKey.listByOrganizationIdAndProjectId.queryOptions({
    organizationId,
    projectId,
  }).queryKey;

  const { mutate: revoke, isPending } = useMutation(
    trpc.apiKey.revoke.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<ApiKey[]>(queryKey);
        if (previous && apiKey) {
          queryClient.setQueryData(
            queryKey,
            previous.filter((k) => k.id !== apiKey.id)
          );
        }
        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous);
        }
        toastManager.add({ title: "Failed to revoke API key", type: "error" });
      },
      onSuccess: () => {
        toastManager.add({
          title: "API key revoked",
          type: "success",
        });
        onOpenChange(false);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    })
  );

  const handleRevoke = () => {
    if (!apiKey) {
      return;
    }
    revoke({ id: apiKey.id, organizationId, projectId });
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Revoke API key</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 px-4 pb-2">
          <Text className="text-ui-fg-subtle" size="small">
            Are you sure you want to revoke{" "}
            <span className="font-medium text-ui-fg-base">{apiKey?.name}</span>?
            Any applications using this key will immediately lose access. This
            cannot be undone.
          </Text>
          {apiKey && (
            <div className="rounded-md border bg-ui-bg-subtle px-3 py-2 font-mono text-ui-fg-muted text-xs">
              {apiKey.keyPrefix}...
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            size="small"
            variant="outline"
          >
            Cancel
          </Button>
          <LoadingButton
            loading={isPending}
            onClick={handleRevoke}
            size="small"
            variant="destructive"
          >
            Revoke key
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
