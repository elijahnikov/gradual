import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";

export function usePlanLimits(organizationId: string | undefined) {
  const trpc = useTRPC();

  const { data, isLoading } = useQuery({
    ...trpc.organization.getLimits.queryOptions({
      organizationId: organizationId as string,
    }),
    enabled: !!organizationId,
  });

  return {
    isLoading,
    plan: data?.plan,
    usage: data?.usage,
    canCreateProject: data?.canCreateProject ?? true,
    canInviteMember: data?.canInviteMember ?? true,
  };
}
