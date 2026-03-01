import { admin, member, owner, viewer } from "@gradual/auth/permissions";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useTRPC } from "@/lib/trpc";

type MemberRole = "owner" | "admin" | "member" | "viewer";

const roles = { owner, admin, member, viewer } as const;

type Resource = keyof (typeof owner)["statements"];
type Action<R extends Resource> = (typeof owner)["statements"][R][number];

function roleHas<R extends Resource>(
  role: MemberRole,
  resource: R,
  action: Action<R>
): boolean {
  const statements = roles[role].statements as Record<
    string,
    readonly string[]
  >;
  const actions = statements[resource];
  return actions?.includes(action) ?? false;
}

export function usePermissions() {
  const params = useParams({ strict: false });
  const trpc = useTRPC();

  const { data: currentMember, isLoading } = useQuery(
    trpc.organizationMember.getCurrentMember.queryOptions({
      organizationSlug: params.organizationSlug as string,
    })
  );

  const role = (currentMember?.role ?? "viewer") as MemberRole;

  return {
    role,
    isLoading,
    // Flags
    canCreateFlags: roleHas(role, "flags", "create"),
    canUpdateFlags: roleHas(role, "flags", "update"),
    canDeleteFlags: roleHas(role, "flags", "delete"),
    // Environments
    canCreateEnvironments: roleHas(role, "environments", "create"),
    canUpdateEnvironments: roleHas(role, "environments", "update"),
    canDeleteEnvironments: roleHas(role, "environments", "delete"),
    // Segments
    canCreateSegments: roleHas(role, "segments", "create"),
    canUpdateSegments: roleHas(role, "segments", "update"),
    canDeleteSegments: roleHas(role, "segments", "delete"),
    // Projects
    canCreateProject: roleHas(role, "project", "create"),
    canUpdateProject: roleHas(role, "project", "update"),
    canDeleteProject: roleHas(role, "project", "delete"),
    // Members
    canInviteMembers: roleHas(role, "members", "invite"),
    canRemoveMembers: roleHas(role, "members", "remove"),
    canUpdateMemberRoles: roleHas(role, "members", "update"),
    // Organization
    canUpdateOrganization: roleHas(role, "organization", "update"),
    canDeleteOrganization: roleHas(role, "organization", "delete"),
    // API Keys
    canReadApiKeys: roleHas(role, "apiKeys", "read"),
    canManageApiKeys: roleHas(role, "apiKeys", "create"),
    // Webhooks — no dedicated resource; follows project-level admin access
    canManageWebhooks: roleHas(role, "project", "update"),
    // Sidebar visibility — derived from project admin access
    canViewAuditLog: roleHas(role, "project", "update"),
    canViewSettings: roleHas(role, "project", "update"),
  };
}
