import type {
  organizationMember,
  organizationMemberRoleEnum,
} from "@gradual/db/schema";
import type { InferSelectModel } from "drizzle-orm";

export type MemberRole = (typeof organizationMemberRoleEnum.enumValues)[number];

export type OrganizationMember = InferSelectModel<typeof organizationMember>;

export interface MemberPermissions {
  canDelete: boolean;
  canUpdateRole: boolean;
}

export const calculateMemberPermissions = (
  currentMember: OrganizationMember,
  targetMember: OrganizationMember
): MemberPermissions => {
  const currentUserRole = currentMember.role as MemberRole;
  const targetMemberRole = targetMember.role as MemberRole;

  const isSelfDeletion = currentMember.userId === targetMember.userId;
  const isSelfUpdate = currentMember.userId === targetMember.userId;

  const canDelete =
    !isSelfDeletion &&
    (currentUserRole === "owner" ||
      (currentUserRole === "admin" &&
        targetMemberRole !== "admin" &&
        targetMemberRole !== "owner"));

  const canUpdateRole =
    !isSelfUpdate &&
    (currentUserRole === "owner" ||
      (currentUserRole === "admin" &&
        targetMemberRole !== "admin" &&
        targetMemberRole !== "owner"));

  return {
    canDelete,
    canUpdateRole,
  };
};
