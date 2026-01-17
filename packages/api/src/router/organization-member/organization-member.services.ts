import { and, eq } from "@gradual/db";
import { member } from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import type {
  CreateOrganizationMemberInput,
  GetOrganizationMembersInput,
  RemoveOrganizationMemberInput,
  UpdateMemberRoleInput,
} from "./organization-member.schemas";
import { calculateMemberPermissions } from "./organization-member.utils";

export const createOrganizationMember = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: CreateOrganizationMemberInput;
}) => {
  const createdMember = await ctx.authApi.addMember({
    body: {
      userId: input.userId,
      role: input.role as "member" | "admin" | "owner",
      organizationId: input.organizationId,
    },
  });
  if (!createdMember) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create member",
    });
  }
  return createdMember;
};

export const getOrganizationMembers = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetOrganizationMembersInput;
}) => {
  const members = await ctx.authApi.listMembers({
    query: {
      organizationId: input.organizationId,
      limit: 100,
      offset: 0,
      sortBy: input.orderBy,
      sortDirection: input.orderDirection,
    },
    headers: ctx.headers,
  });

  const membersWithPermissions = members.members.map((member) => ({
    ...member,
    permissions: calculateMemberPermissions(ctx.organizationMember, member),
  }));
  return membersWithPermissions;
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
    .from(member)
    .where(
      and(
        eq(member.id, input.id),
        eq(member.organizationId, input.organizationId)
      )
    )
    .limit(1);

  if (!memberToRemove) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Member not found",
    });
  }

  if (memberToRemove.role === "owner") {
    const owners = await ctx.db
      .select()
      .from(member)
      .where(
        and(
          eq(member.organizationId, input.organizationId),
          eq(member.role, "owner")
        )
      );

    if (owners.length === 1) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot remove the last owner of the organization",
      });
    }
  }

  const { canDelete } = calculateMemberPermissions(
    ctx.organizationMember,
    memberToRemove
  );

  if (!canDelete) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not allowed to remove this member",
    });
  }

  const removedMember = await ctx.authApi.removeMember({
    body: {
      memberIdOrEmail: memberToRemove.userId,
      organizationId: input.organizationId,
    },
    headers: ctx.headers,
  });

  if (!removedMember) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to remove member",
    });
  }

  return removedMember;
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
    .from(member)
    .where(
      and(
        eq(member.id, input.id),
        eq(member.organizationId, input.organizationId)
      )
    );

  if (!memberToUpdate) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Member not found",
    });
  }

  if (memberToUpdate.role === "owner" && input.role !== "owner") {
    const owners = await ctx.db
      .select()
      .from(member)
      .where(
        and(
          eq(member.organizationId, input.organizationId),
          eq(member.role, "owner")
        )
      );

    if (owners.length === 1) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot demote the last owner of the organization",
      });
    }
  }

  const { canUpdateRole } = calculateMemberPermissions(
    currentUser,
    memberToUpdate
  );

  if (!canUpdateRole) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not allowed to update the role of this member",
    });
  }

  const [updatedMember] = await ctx.db
    .update(member)
    .set({ role: input.role })
    .where(eq(member.id, input.id))
    .returning();

  return updatedMember;
};
