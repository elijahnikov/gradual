import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
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
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { RiFlagLine } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTRPC } from "@/lib/trpc";

interface DeleteSegmentDialogProps {
  children?: React.ReactNode;
  segment: {
    id: string;
    name: string;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDeleted?: () => void;
}

export default function DeleteSegmentDialog({
  children,
  segment,
  open,
  onOpenChange,
  onDeleted,
}: DeleteSegmentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const { organizationSlug, projectSlug } = useParams({ strict: false });

  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const { data: flags = [], isLoading: isLoadingFlags } = useQuery(
    trpc.segments.listFlagsBySegment.queryOptions(
      {
        segmentId: segment.id,
        organizationSlug: organizationSlug as string,
        projectSlug: projectSlug as string,
      },
      { enabled: !!open }
    )
  );

  const hasFlags = flags.length > 0;

  const { mutateAsync: deleteSegment } = useMutation(
    trpc.segments.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.segments.pathFilter());
      },
    })
  );

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteSegment({
        segmentId: segment.id,
        organizationSlug: organizationSlug as string,
        projectSlug: projectSlug as string,
      });
      toastManager.add({
        title: "Segment deleted",
        type: "success",
      });
      onOpenChange?.(false);
      onDeleted?.();
    } catch {
      toastManager.add({
        title: "Failed to delete segment",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      {children && <DialogTrigger render={() => <>{children}</>} />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-md">Delete segment</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 p-4">
          <Text size="small" weight="plus">
            Are you sure you want to delete "{segment.name}"?
          </Text>

          {isLoadingFlags ? (
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : hasFlags ? (
            <>
              <Text className="text-ui-fg-muted" size="small">
                This segment is used by {flags.length}{" "}
                {flags.length === 1 ? "flag" : "flags"}. Remove the segment from
                these flags first before you delete.
              </Text>
              <Card className="flex flex-col gap-1 bg-ui-bg-base p-2">
                {flags.map((flag) => (
                  <Link
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 transition-colors hover:bg-ui-bg-base-hover"
                    key={flag.id}
                    onClick={() => onOpenChange?.(false)}
                    params={{
                      organizationSlug: organizationSlug as string,
                      projectSlug: projectSlug as string,
                      flagSlug: flag.key,
                    }}
                    search={
                      flag.environments?.length === 1
                        ? {
                            tab: "targeting",
                            environment: flag.environments[0]?.slug,
                          }
                        : undefined
                    }
                    to="/$organizationSlug/$projectSlug/flags/$flagSlug"
                  >
                    <RiFlagLine className="size-3.5 shrink-0 text-ui-fg-muted" />
                    <Text className="flex-1 font-mono" size="xsmall">
                      {flag.name}
                    </Text>
                    <div className="flex items-center gap-1">
                      {flag.environments?.map((env) => (
                        <Badge
                          className="gap-1"
                          key={env.slug}
                          size="sm"
                          variant="outline"
                        >
                          <div
                            className="size-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor: env.color ?? undefined,
                            }}
                          />
                          {env.name}
                        </Badge>
                      ))}
                    </div>
                  </Link>
                ))}
              </Card>
            </>
          ) : (
            <Text className="text-ui-fg-muted" size="small">
              This action cannot be undone.
            </Text>
          )}
        </div>

        <DialogFooter className="flex items-center gap-2">
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <LoadingButton
            className="w-full text-white!"
            disabled={hasFlags || isLoadingFlags}
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
