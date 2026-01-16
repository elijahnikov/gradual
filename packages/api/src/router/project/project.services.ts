import { and, eq, isNull } from "@gradual/db";
import { project } from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import { createApiKey } from "../api-key/api-key.services";
import type {
  CreateProjectInput,
  DeleteProjectInput,
  GetAllProjectsByOrganizationIdInput,
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
