import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { RiBuilding2Fill, RiCheckLine, RiCloseLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { upperFirst } from "lodash";
import { useState } from "react";
import { authClient } from "@/auth/client";

export default function AcceptInvitationPage({
  invitationId,
}: {
  invitationId: string;
}) {
  const navigate = useNavigate();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const {
    data: invitation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["invitation", invitationId],
    queryFn: async () => {
      const result = await authClient.organization.getInvitation({
        query: { id: invitationId },
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to fetch invitation");
      }
      return result.data;
    },
  });

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const result = await authClient.organization.acceptInvitation({
        invitationId,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to accept invitation");
      }
      toastManager.add({
        title: "Invitation accepted",
        description: `You've joined ${invitation?.organizationName}`,
        type: "success",
      });
      navigate({
        to: "/$organizationSlug",
        params: { organizationSlug: invitation?.organizationSlug ?? "" },
      });
    } catch {
      toastManager.add({
        title: "Failed to accept invitation",
        description: "Please try again",
        type: "error",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      const result = await authClient.organization.rejectInvitation({
        invitationId,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to reject invitation");
      }
      toastManager.add({
        title: "Invitation declined",
        type: "info",
      });
      navigate({ to: "/" });
    } catch {
      toastManager.add({
        title: "Failed to decline invitation",
        description: "Please try again",
        type: "error",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-ui-bg-subtle">
        <Card className="flex w-full max-w-md flex-col items-center gap-6 p-8">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex w-full gap-3">
            <Skeleton className="h-8 flex-1 rounded-md" />
            <Skeleton className="h-8 flex-1 rounded-md" />
          </div>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Text className="text-ui-fg-muted" size="small">
          This invitation is invalid or has expired.
        </Text>
        <Button
          onClick={() => navigate({ to: "/" })}
          size="small"
          variant="outline"
        >
          Go to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-ui-bg-subtle">
      <Card className="flex w-full max-w-md flex-col items-center gap-6 p-8">
        <div className="flex size-16 items-center justify-center rounded-full bg-ui-bg-subtle shadow-borders-base">
          <RiBuilding2Fill className="size-7 text-ui-fg-muted" />
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <Text size="large" weight="plus">
            Join {invitation.organizationName}
          </Text>
          <Text className="text-ui-fg-muted" size="small">
            You've been invited to join as{" "}
            <span className="font-semibold">{upperFirst(invitation.role)}</span>
          </Text>
        </div>
        <div className="flex w-full gap-3">
          <Button
            className="flex-1"
            disabled={isAccepting || isRejecting}
            onClick={handleReject}
            size="small"
            variant="outline"
          >
            <RiCloseLine className="mr-1 size-4" />
            Decline
          </Button>
          <LoadingButton
            className="flex-1"
            loading={isAccepting}
            onClick={handleAccept}
            size="small"
            variant="gradual"
          >
            <RiCheckLine className="mr-1 size-4" />
            Accept
          </LoadingButton>
        </div>
      </Card>
    </div>
  );
}
