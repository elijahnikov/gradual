import { member, project } from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import type {
  ProtectedOrganizationTRPCContext,
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
  ctx: ProtectedOrganizationTRPCContext;
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
  const foundOrganization = await ctx.authApi.getFullOrganization({
    query: {
      organizationSlug: input.organizationSlug,
    },
    headers: ctx.headers,
  });
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

  const createdOrganization = await ctx.authApi.createOrganization({
    body: {
      name: input.name,
      slug: input.slug,
      userId: currentUser.id,
      keepCurrentActiveOrganization: false,
    },
    headers: ctx.headers,
  });
  if (!createdOrganization) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create organization",
    });
  }

  const data = await ctx.authApi.setActiveOrganization({
    body: {
      organizationId: createdOrganization.id,
    },
    headers: ctx.headers,
  });

  if (!data) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to set active organization",
    });
  }

  await ctx.authApi.setActiveOrganization({
    body: {
      organizationId: createdOrganization.id,
    },
    headers: ctx.headers,
  });

  return createdOrganization;
};

export const updateOrganization = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: UpdateOrganizationInput;
}) => {
  const updatedOrganization = await ctx.authApi.updateOrganization({
    body: {
      data: {
        name: input.name,
        slug: input.slug,
      },
      organizationId: input.organizationId,
    },
    headers: ctx.headers,
  });
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
  ctx: ProtectedOrganizationTRPCContext;
  input: DeleteOrganizationInput;
}) => {
  const deletedOrganization = await ctx.authApi.deleteOrganization({
    body: {
      organizationId: input.organizationId,
    },
    headers: ctx.headers,
  });

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
  const organizations = await ctx.authApi.listOrganizations({
    headers: ctx.headers,
  });

  const organizationIds = organizations.map((organization) => organization.id);
  const memberData = await ctx.db.query.member.findMany({
    where: and(
      inArray(member.organizationId, organizationIds),
      eq(member.userId, ctx.session.user.id)
    ),
  });

  const projects = await ctx.db.query.project.findMany({
    where: inArray(project.organizationId, organizationIds),
    columns: {
      id: true,
      name: true,
      slug: true,
      organizationId: true,
    },
  });

  const organizationsWithMembersAndProjects = organizations.map(
    (organization) => ({
      organization,
      projects: projects.filter(
        (project) => project.organizationId === organization.id
      ),
      member: memberData.find(
        (member) => member.organizationId === organization.id
      ),
    })
  );

  return organizationsWithMembersAndProjects;
};

export const checkSlugAvailability = async ({
  ctx,
  input,
}: {
  ctx: ProtectedTRPCContext;
  input: CheckSlugAvailabilityInput;
}) => {
  const data = await ctx.authApi.checkOrganizationSlug({
    body: {
      slug: input.slug,
    },
  });
  return data.status;
};
