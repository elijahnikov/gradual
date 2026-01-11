import type { organizationMemberRoleEnum } from "@gradual/db/schema";

export type MemberRole = (typeof organizationMemberRoleEnum.enumValues)[number];

export interface MemberPermissions {
  canDelete: boolean;
  canUpdateRole: boolean;
}

export const calculateMemberPermissions = (
  currentUserRole: MemberRole,
  targetMemberRole: MemberRole
): MemberPermissions => {
  const canDelete =
    currentUserRole === "owner" ||
    (currentUserRole === "admin" &&
      targetMemberRole !== "admin" &&
      targetMemberRole !== "owner");

  const canUpdateRole =
    currentUserRole === "owner" ||
    (currentUserRole === "admin" &&
      targetMemberRole !== "admin" &&
      targetMemberRole !== "owner");

  return {
    canDelete,
    canUpdateRole,
  };
};
