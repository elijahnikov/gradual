import { segment } from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import type { CreateSegmentInput, ListSegmentsInput } from "./segments.schemas";

export const listSegments = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: ListSegmentsInput;
}) => {
  const { projectSlug } = input;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(slug, projectSlug),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  const segments = await ctx.db.query.segment.findMany({
    where: (table, { eq, and, isNull }) =>
      and(
        eq(table.projectId, foundProject.id),
        eq(table.organizationId, ctx.organization.id),
        isNull(table.deletedAt)
      ),
    orderBy: (table, { asc }) => asc(table.name),
  });

  return segments;
};

export const createSegment = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: CreateSegmentInput;
}) => {
  const { projectSlug, organizationSlug, ...segmentData } = input;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(slug, projectSlug),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  const existingSegment = await ctx.db.query.segment.findFirst({
    where: (table, { eq, and, isNull }) =>
      and(
        eq(table.key, segmentData.key),
        eq(table.projectId, foundProject.id),
        eq(table.organizationId, ctx.organization.id),
        isNull(table.deletedAt)
      ),
  });

  if (existingSegment) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `Segment with key "${segmentData.key}" already exists`,
    });
  }

  const [createdSegment] = await ctx.db
    .insert(segment)
    .values({
      ...segmentData,
      projectId: foundProject.id,
      organizationId: ctx.organization.id,
    })
    .returning();

  return createdSegment;
};
