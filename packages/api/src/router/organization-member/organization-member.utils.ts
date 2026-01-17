import type { member } from "@gradual/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import z from "zod/v4";

const memberRoleEnum = z.enum(["member", "admin", "owner"]);
export type MemberRole = (typeof memberRoleEnum.options)[number];

export type Member = InferSelectModel<typeof member>;

export interface MemberPermissions {
  canDelete: boolean;
  canUpdateRole: boolean;
}

export const calculateMemberPermissions = (
  currentMember: Member,
  targetMember: Member
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
