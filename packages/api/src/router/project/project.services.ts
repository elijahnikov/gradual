import { and, eq, isNull } from "@gradual/db";
import {
  featureFlag,
  organization,
  project,
  segment,
} from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import { createApiKey } from "../api-key/api-key.services";
import { seedDefaultAttributes } from "../attributes/attributes.services";
import { createEnvironment } from "../environment";
import { getEnvironmentColorByIndex } from "../environment/environment.utils";
import type {
  CreateProjectInput,
  DeleteProjectInput,
  GetAllProjectsByOrganizationIdInput,
  GetBreadcrumbsInput,
  GetProjectByIdInput,
  GetProjectBySlugInput,
  UpdateProjectInput,
} from "./project.schemas";

export const createProject = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: CreateProjectInput;
}) => {
  const [createdProject] = await ctx.db
    .insert(project)
    .values(input)
    .returning();
  if (!createdProject) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create project",
    });
  }
  await createApiKey({
    input: {
      projectId: createdProject.id,
      organizationId: ctx.organization.id,
      name: createdProject.name,
    },
    ctx,
  });
  await Promise.all([
    createEnvironment({
      input: {
        name: "Production",
        slug: "production",
        organizationSlug: ctx.organization.slug,
        projectSlug: createdProject.slug,
        color: getEnvironmentColorByIndex(0),
      },
      ctx,
    }),
    createEnvironment({
      input: {
        name: "Development",
        slug: "development",
        organizationSlug: ctx.organization.slug,
        projectSlug: createdProject.slug,
        color: getEnvironmentColorByIndex(1),
      },
      ctx,
    }),
    seedDefaultAttributes({
      ctx,
      projectId: createdProject.id,
      organizationId: ctx.organization.id,
    }),
  ]);
  return createdProject;
};

export const getProjectById = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetProjectByIdInput;
}) => {
  const [foundProject] = await ctx.db
    .select()
    .from(project)
    .where(
      and(
        eq(project.id, input.projectId),
        isNull(project.deletedAt),
        eq(project.organizationId, input.organizationId)
      )
    );
  if (!foundProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }
  return foundProject;
};

export const getProjectBySlug = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetProjectBySlugInput;
}) => {
  const [foundProject] = await ctx.db
    .select()
    .from(project)
    .where(
      and(
        eq(project.slug, input.slug),
        isNull(project.deletedAt),
        eq(project.organizationId, ctx.organization.id)
      )
    );
  if (!foundProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }
  return foundProject;
};

export const updateProject = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: UpdateProjectInput;
}) => {
  const { projectId: _, organizationId: __, ...rest } = input;
  const [updatedProject] = await ctx.db
    .update(project)
    .set(rest)
    .where(
      and(
        eq(project.id, input.projectId),
        isNull(project.deletedAt),
        eq(project.organizationId, ctx.organization.id)
      )
    )
    .returning();

  if (!updatedProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }
  return updatedProject;
};

export const deleteProject = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: DeleteProjectInput;
}) => {
  const [deletedProject] = await ctx.db
    .update(project)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(project.id, input.projectId),
        isNull(project.deletedAt),
        eq(project.organizationId, ctx.organization.id)
      )
    )
    .returning();
  if (!deletedProject) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete project",
    });
  }
  return deletedProject;
};

export const getAllProjectsByOrganizationId = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetAllProjectsByOrganizationIdInput;
}) => {
  const projects = await ctx.db
    .select()
    .from(project)
    .where(
      and(
        isNull(project.deletedAt),
        eq(project.organizationId, input.organizationId)
      )
    );

  return projects;
};

export const getBreadcrumbs = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetBreadcrumbsInput;
}) => {
  const { projectSlug, flagSlug, segmentSlug } = input;

  // Get project name
  const [foundProject] = await ctx.db
    .select({
      name: project.name,
    })
    .from(project)
    .innerJoin(organization, eq(project.organizationId, organization.id))
    .where(
      and(
        eq(project.slug, projectSlug),
        eq(organization.slug, ctx.organization.slug),
        isNull(project.deletedAt),
        eq(project.organizationId, ctx.organization.id)
      )
    )
    .limit(1);

  if (!foundProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  // Optionally get flag name if flagSlug is provided
  let flagName: string | null = null;
  if (flagSlug) {
    const [foundFlag] = await ctx.db
      .select({
        name: featureFlag.name,
      })
      .from(featureFlag)
      .innerJoin(project, eq(featureFlag.projectId, project.id))
      .innerJoin(organization, eq(featureFlag.organizationId, organization.id))
      .where(
        and(
          eq(featureFlag.key, flagSlug),
          eq(project.slug, projectSlug),
          eq(organization.slug, ctx.organization.slug),
          eq(featureFlag.organizationId, ctx.organization.id)
        )
      )
      .limit(1);

    flagName = foundFlag?.name ?? null;
  }

  // Optionally get segment name if segmentSlug is provided
  let segmentName: string | null = null;
  if (segmentSlug) {
    const [foundSegment] = await ctx.db
      .select({
        name: segment.name,
      })
      .from(segment)
      .innerJoin(project, eq(segment.projectId, project.id))
      .innerJoin(organization, eq(segment.organizationId, organization.id))
      .where(
        and(
          eq(segment.key, segmentSlug),
          eq(project.slug, projectSlug),
          eq(organization.slug, ctx.organization.slug),
          eq(segment.organizationId, ctx.organization.id),
          isNull(segment.deletedAt)
        )
      )
      .limit(1);

    segmentName = foundSegment?.name ?? null;
  }

  return {
    projectName: foundProject.name,
    flagName,
    segmentName,
  };
};
