import { and, eq, isNull } from "@gradual/db";
import { organizationMember } from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import type {
  CreateOrganizationMemberInput,
  GetOrganizationMembersInput,
  RemoveOrganizationMemberInput,
  UpdateMemberRoleInput,
} from "./organization-member.schemas";
import {
  calculateMemberPermissions,
  type MemberRole,
} from "./organization-member.utils";

export const createOrganizationMember = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: CreateOrganizationMemberInput;
}) => {
  const [createdOrganizationMember] = await ctx.db
    .insert(organizationMember)
    .values(input)
    .returning();

  return createdOrganizationMember;
};

export const getOrganizationMembers = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetOrganizationMembersInput;
}) => {
  const organizationMembers = await ctx.db.query.organizationMember.findMany({
    where: (organizationMember, { eq }) =>
      eq(organizationMember.organizationId, input.organizationId),
    with: {
      user: {
        columns: {
          id: true,
          email: true,
          image: true,
          name: true,
          createdAt: true,
        },
      },
    },
    limit: input.limit,
  });

  const currentUserRole = ctx.organizationMember.role as MemberRole;

  return organizationMembers.map((member) => ({
    ...member,
    permissions: calculateMemberPermissions(
      currentUserRole,
      member.role as MemberRole
    ),
  }));
};

export const removeOrganizationMember = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: RemoveOrganizationMemberInput;
}) => {
  const [memberToRemove] = await ctx.db
    .select()
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.id, input.id),
        eq(organizationMember.organizationId, input.organizationId),
        isNull(organizationMember.deletedAt)
      )
    )
    .limit(1);

  if (!memberToRemove) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Member not found",
    });
  }

  const { canDelete } = calculateMemberPermissions(
    ctx.organizationMember.role as MemberRole,
    memberToRemove.role as MemberRole
  );

  if (!canDelete) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not allowed to remove this member",
    });
  }

  await ctx.db
    .update(organizationMember)
    .set({
      deletedAt: new Date(),
    })
    .where(eq(organizationMember.id, input.id));

  return { success: true };
};

export const updateMemberRole = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: UpdateMemberRoleInput;
}) => {
  const currentUser = ctx.organizationMember;
  const [memberToUpdate] = await ctx.db
    .select()
    .from(organizationMember)
    .where(eq(organizationMember.id, input.id));

  if (!memberToUpdate) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Member not found",
    });
  }

  const { canUpdateRole } = calculateMemberPermissions(
    currentUser.role,
    memberToUpdate.role
  );

  if (!canUpdateRole) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not allowed to update the role of this member",
    });
  }

  const [updatedMember] = await ctx.db
    .update(organizationMember)
    .set({ role: input.role })
    .where(eq(organizationMember.id, input.id))
    .returning();

  return updatedMember;
};
