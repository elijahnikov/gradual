"use client";

import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { RiArrowRightSLine, RiBuilding2Fill } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { upperFirst } from "lodash";
import { useState } from "react";
import { authClient } from "@/auth/client";
import { useTRPC } from "@/lib/trpc";
import { CreateOrgStep } from "./create-org-step";

interface JoinOrCreateStepProps {
  onComplete: (
    organizationId: string,
    projectId: string,
    organizationSlug: string
  ) => void;
  onAcceptInvitation: (organizationSlug: string) => Promise<void>;
  isLoading?: boolean;
}

export function JoinOrCreateStep({
  onComplete,
  onAcceptInvitation,
  isLoading,
}: JoinOrCreateStepProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [joiningOrgId, setJoiningOrgId] = useState<string | null>(null);

  const { data: invitations, isLoading: isLoadingInvitations } = useQuery({
    queryKey: ["user-invitations"],
    queryFn: async () => {
      const result = await authClient.organization.listUserInvitations();
      if (result.error) {
        return [];
      }
      return result.data ?? [];
    },
  });

  const { data: domainOrgs, isLoading: isLoadingDomainOrgs } = useQuery(
    trpc.organizationDomain.getOrgsByDomain.queryOptions({})
  );

  const { mutateAsync: joinByDomain } = useMutation(
    trpc.organizationDomain.joinByDomain.mutationOptions()
  );

  const pendingInvitations = (invitations ?? []).filter(
    (inv) => inv.status === "pending"
  );

  const domainMatches = domainOrgs ?? [];
  const isLoadingData = isLoadingInvitations || isLoadingDomainOrgs;

  if (isLoadingData) {
    return (
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-[72px] w-full rounded-lg" />
        <Skeleton className="h-[72px] w-full rounded-lg" />
      </div>
    );
  }

  const hasOptions = pendingInvitations.length > 0 || domainMatches.length > 0;
  const isJoining = acceptingId !== null || joiningOrgId !== null;

  if (!(hasOptions || isJoining) || showCreateOrg) {
    return <CreateOrgStep isLoading={isLoading} onComplete={onComplete} />;
  }

  const handleAccept = async (invitationId: string) => {
    setAcceptingId(invitationId);
    try {
      const result = await authClient.organization.acceptInvitation({
        invitationId,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to accept invitation");
      }
      const invitation = pendingInvitations.find(
        (inv) => inv.id === invitationId
      );
      if (invitation?.organizationId) {
        const orgResult = await authClient.organization.getFullOrganization({
          query: { organizationId: invitation.organizationId },
        });
        const orgSlug = orgResult.data?.slug;
        if (orgSlug) {
          toastManager.add({
            title: "Invitation accepted",
            description: `You've joined ${invitation.organizationName}, redirecting...`,
            type: "success",
          });
          await onAcceptInvitation(orgSlug);
        }
      }
    } catch {
      toastManager.add({
        title: "Failed to accept invitation",
        description: "Please try again",
        type: "error",
      });
    } finally {
      setAcceptingId(null);
    }
  };

  const handleJoinByDomain = async (org: (typeof domainMatches)[number]) => {
    setJoiningOrgId(org.organizationId);
    try {
      await joinByDomain({ organizationId: org.organizationId });
      await queryClient.invalidateQueries(
        trpc.organizationDomain.getOrgsByDomain.queryOptions({})
      );
      toastManager.add({
        title: "Joined organization",
        description: `You've joined ${org.organizationName}, redirecting...`,
        type: "success",
      });
      await onAcceptInvitation(org.organizationSlug);
    } catch {
      toastManager.add({
        title: "Failed to join organization",
        description: "Please try again",
        type: "error",
      });
    } finally {
      setJoiningOrgId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6">
      {domainMatches.length > 0 && (
        <div className="flex flex-col gap-3">
          <Text size="small" weight="plus">
            Your organization is already on Gradual
          </Text>
          {domainMatches.map((org) => (
            <Card
              className="flex items-center gap-3 rounded-lg p-4"
              key={org.organizationId}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ui-bg-subtle shadow-borders-base">
                {org.organizationLogo ? (
                  <img
                    alt={org.organizationName}
                    className="size-full rounded-full object-cover"
                    height={40}
                    src={org.organizationLogo}
                    width={40}
                  />
                ) : (
                  <RiBuilding2Fill className="size-5 text-ui-fg-muted" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <Text size="small" weight="plus">
                  {org.organizationName}
                </Text>
                <Text className="text-ui-fg-muted" size="xsmall">
                  {org.domain}
                </Text>
              </div>
              <LoadingButton
                loading={joiningOrgId === org.organizationId}
                onClick={() => handleJoinByDomain(org)}
                size="small"
                variant="gradual"
              >
                Join
                <RiArrowRightSLine className="ml-0.5 size-4" />
              </LoadingButton>
            </Card>
          ))}
        </div>
      )}

      {pendingInvitations.length > 0 && (
        <div className="flex flex-col gap-3">
          <Text size="small" weight="plus">
            Pending invitations
          </Text>
          {pendingInvitations.map((invitation) => (
            <Card
              className="flex items-center gap-3 rounded-lg p-4"
              key={invitation.id}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ui-bg-subtle shadow-borders-base">
                <RiBuilding2Fill className="size-5 text-ui-fg-muted" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <Text size="small" weight="plus">
                  {invitation.organizationName}
                </Text>
                <Text className="text-ui-fg-muted" size="xsmall">
                  Invited as {upperFirst(invitation.role)}
                </Text>
              </div>
              <LoadingButton
                loading={acceptingId === invitation.id}
                onClick={() => handleAccept(invitation.id)}
                size="small"
                variant="gradual"
              >
                Join
                <RiArrowRightSLine className="ml-0.5 size-4" />
              </LoadingButton>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-ui-border-base" />
        <Text className="text-ui-fg-muted" size="xsmall">
          or
        </Text>
        <div className="h-px flex-1 bg-ui-border-base" />
      </div>

      <Button
        className="mx-auto"
        onClick={() => setShowCreateOrg(true)}
        size="small"
        variant="outline"
      >
        Create a new organization
      </Button>
    </div>
  );
}
