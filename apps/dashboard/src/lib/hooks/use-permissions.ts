import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useTRPC } from "@/lib/trpc";

type MemberRole = "owner" | "admin" | "member" | "viewer";

const ROLE_HIERARCHY: MemberRole[] = ["viewer", "member", "admin", "owner"];

export function usePermissions() {
  const params = useParams({ strict: false });
  const trpc = useTRPC();

  const { data: currentMember, isLoading } = useQuery(
    trpc.organizationMember.getCurrentMember.queryOptions({
      organizationSlug: params.organizationSlug as string,
    })
  );

  // Default to most restrictive role while loading
  const role = (currentMember?.role ?? "viewer") as MemberRole;

  const isAtLeast = (min: MemberRole) =>
    ROLE_HIERARCHY.indexOf(role) >= ROLE_HIERARCHY.indexOf(min);

  return {
    role,
    isLoading,
    // Flags, Environments, Segments — member+
    canCreateFlags: isAtLeast("member"),
    canUpdateFlags: isAtLeast("member"),
    canDeleteFlags: isAtLeast("member"),
    canCreateEnvironments: isAtLeast("member"),
    canUpdateEnvironments: isAtLeast("member"),
    canDeleteEnvironments: isAtLeast("member"),
    canCreateSegments: isAtLeast("member"),
    canUpdateSegments: isAtLeast("member"),
    canDeleteSegments: isAtLeast("member"),
    // Projects — admin+
    canCreateProject: isAtLeast("admin"),
    canUpdateProject: isAtLeast("admin"),
    canDeleteProject: isAtLeast("admin"),
    // Members — admin+
    canInviteMembers: isAtLeast("admin"),
    canRemoveMembers: isAtLeast("admin"),
    canUpdateMemberRoles: isAtLeast("admin"),
    // Organization — owner only
    canUpdateOrganization: role === "owner",
    canDeleteOrganization: role === "owner",
    // API Keys
    canReadApiKeys: isAtLeast("member"),
    canManageApiKeys: isAtLeast("admin"),
    // Webhooks
    canManageWebhooks: isAtLeast("admin"),
  };
}
