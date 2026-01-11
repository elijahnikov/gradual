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
import { calculateMemberPermissions } from "./organization-member.utils";

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
      and(
        eq(organizationMember.organizationId, input.organizationId),
        isNull(organizationMember.deletedAt)
      ),
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

  return organizationMembers.map((member) => ({
    ...member,
    permissions: calculateMemberPermissions(ctx.organizationMember, member),
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

  if (memberToRemove.role === "owner") {
    const owners = await ctx.db
      .select()
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, input.organizationId),
          eq(organizationMember.role, "owner"),
          isNull(organizationMember.deletedAt)
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
    .where(
      and(
        eq(organizationMember.id, input.id),
        eq(organizationMember.organizationId, input.organizationId),
        isNull(organizationMember.deletedAt)
      )
    );

  if (!memberToUpdate) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Member not found",
    });
  }

  // Prevent demoting the last owner
  if (memberToUpdate.role === "owner" && input.role !== "owner") {
    const owners = await ctx.db
      .select()
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, input.organizationId),
          eq(organizationMember.role, "owner"),
          isNull(organizationMember.deletedAt)
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
    .update(organizationMember)
    .set({ role: input.role })
    .where(eq(organizationMember.id, input.id))
    .returning();

  return updatedMember;
};
