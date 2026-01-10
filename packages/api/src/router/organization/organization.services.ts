import { and, eq } from "@gradual/db";
import { organization, organizationMember } from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import { isNull, not } from "drizzle-orm";
import type {
  OrganizationProtectedTRPCContext,
  ProtectedTRPCContext,
} from "../../trpc";
import type {
  CheckSlugAvailabilityInput,
  CreateOrganizationInput,
  DeleteOrganizationInput,
  GetOrganizationBySlugInput,
  UpdateOrganizationInput,
} from "./organization.schemas";

export const getOrganizationById = ({
  ctx,
}: {
  ctx: OrganizationProtectedTRPCContext;
}) => {
  return {
    organization: ctx.organization,
    member: ctx.organizationMember,
  };
};

export const getOrganizationBySlug = async ({
  ctx,
  input,
}: {
  ctx: ProtectedTRPCContext;
  input: GetOrganizationBySlugInput;
}) => {
  const slug = input.slug;
  const [foundOrganization] = await ctx.db
    .select()
    .from(organization)
    .where(eq(organization.slug, slug));

  if (!foundOrganization) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Organization not found",
    });
  }

  return foundOrganization;
};

export const createOrganization = async ({
  ctx,
  input,
}: {
  ctx: ProtectedTRPCContext;
  input: CreateOrganizationInput;
}) => {
  const currentUser = ctx.session.user;
  const [createdOrganization] = await ctx.db
    .insert(organization)
    .values({
      ...input,
      createdById: currentUser.id,
    })
    .returning();

  if (!createdOrganization) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create organization",
    });
  }

  await ctx.db.insert(organizationMember).values({
    organizationId: createdOrganization.id,
    userId: currentUser.id,
    role: "admin",
  });

  return createdOrganization;
};

export const updateOrganization = async ({
  ctx,
  input,
}: {
  ctx: OrganizationProtectedTRPCContext;
  input: UpdateOrganizationInput;
}) => {
  const [updatedOrganization] = await ctx.db
    .update(organization)
    .set(input)
    .where(eq(organization.id, ctx.organization.id))
    .returning();

  if (!updatedOrganization) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to update organization",
    });
  }

  return updatedOrganization;
};

export const deleteOrganization = async ({
  ctx,
  input,
}: {
  ctx: OrganizationProtectedTRPCContext;
  input: DeleteOrganizationInput;
}) => {
  const [deletedOrganization] = await ctx.db
    .update(organization)
    .set({
      deletedAt: new Date(),
    })
    .where(eq(organization.id, input.organizationId))
    .returning();

  if (!deletedOrganization) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete organization",
    });
  }

  return deletedOrganization;
};

export const getAllOrganizationsByUserId = async ({
  ctx,
}: {
  ctx: ProtectedTRPCContext;
}) => {
  const userId = ctx.session.user.id;

  const ownedOrganizations = await ctx.db
    .select()
    .from(organization)
    .where(
      and(eq(organization.createdById, userId), isNull(organization.deletedAt))
    );

  const memberOrganizations = await ctx.db
    .select({
      organization,
      member: organizationMember,
    })
    .from(organizationMember)
    .innerJoin(
      organization,
      eq(organizationMember.organizationId, organization.id)
    )
    .where(
      and(
        eq(organizationMember.userId, userId),
        not(eq(organization.createdById, userId)),
        isNull(organization.deletedAt)
      )
    );

  return {
    owned: ownedOrganizations,
    member: memberOrganizations.map((result) => ({
      organization: result.organization,
      role: result.member.role,
      joinedAt: result.member.createdAt,
    })),
  };
};

export const checkSlugAvailability = async ({
  ctx,
  input,
}: {
  ctx: ProtectedTRPCContext;
  input: CheckSlugAvailabilityInput;
}) => {
  const slug = input.slug;
  const slugAvailability = await ctx.db
    .select()
    .from(organization)
    .where(eq(organization.slug, slug));
  return slugAvailability.length === 0;
};
