import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  lt,
  or,
} from "@gradual/db";
import {
  featureFlagEnvironment,
  featureFlagSegmentTarget,
  featureFlagTarget,
  segment,
} from "@gradual/db/schema";
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
  const { projectSlug, limit, cursor, sortBy, sortOrder, search } = input;

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

  const baseWhereClauses = [
    eq(segment.projectId, foundProject.id),
    eq(segment.organizationId, ctx.organization.id),
    isNull(segment.deletedAt),
  ];

  if (search) {
    const searchPattern = `%${search}%`;
    baseWhereClauses.push(
      // biome-ignore lint/style/noNonNullAssertion: or() returns defined when given conditions
      or(ilike(segment.name, searchPattern), ilike(segment.key, searchPattern))!
    );
  }

  const total = await ctx.db
    .select({ count: count() })
    .from(segment)
    .where(and(...baseWhereClauses));

  const sortCol =
    sortBy === "name"
      ? segment.name
      : sortBy === "createdAt"
        ? segment.createdAt
        : segment.updatedAt;

  const whereClauses = [...baseWhereClauses];

  if (cursor) {
    const cmp = sortOrder === "asc" ? gt : lt;
    if (sortBy === "name") {
      const col = segment.name;
      const val = cursor.value as string;
      whereClauses.push(
        // biome-ignore lint/style/noNonNullAssertion: or() returns defined when given conditions
        or(cmp(col, val), and(eq(col, val), cmp(segment.id, cursor.id)))!
      );
    } else {
      const col =
        sortBy === "createdAt" ? segment.createdAt : segment.updatedAt;
      const val = new Date(cursor.value as string);
      whereClauses.push(
        // biome-ignore lint/style/noNonNullAssertion: or() returns defined when given conditions
        or(cmp(col, val), and(eq(col, val), cmp(segment.id, cursor.id)))!
      );
    }
  }

  const orderDir = sortOrder === "asc" ? asc : desc;

  const items = await ctx.db
    .select()
    .from(segment)
    .where(and(...whereClauses))
    .orderBy(orderDir(sortCol), orderDir(segment.id))
    .limit(limit + 1);

  const hasNextPage = items.length > limit;
  const pageItems = hasNextPage ? items.slice(0, limit) : items;
  const last = pageItems.at(-1);

  let nextCursorValue: string | null = null;
  if (hasNextPage && last) {
    if (sortBy === "name") {
      nextCursorValue = last.name;
    } else {
      const dateValue = last[sortBy];
      nextCursorValue =
        dateValue instanceof Date ? dateValue.toISOString() : dateValue;
    }
  }

  // Count distinct flags using each segment
  const segmentIds = pageItems.map((s) => s.id);
  let flagCountMap = new Map<string, number>();

  if (segmentIds.length > 0) {
    const flagCounts = await ctx.db
      .select({
        segmentId: featureFlagSegmentTarget.segmentId,
        flagCount: countDistinct(featureFlagEnvironment.featureFlagId),
      })
      .from(featureFlagSegmentTarget)
      .innerJoin(
        featureFlagTarget,
        eq(featureFlagSegmentTarget.targetId, featureFlagTarget.id)
      )
      .innerJoin(
        featureFlagEnvironment,
        eq(
          featureFlagTarget.featureFlagEnvironmentId,
          featureFlagEnvironment.id
        )
      )
      .where(inArray(featureFlagSegmentTarget.segmentId, segmentIds))
      .groupBy(featureFlagSegmentTarget.segmentId);

    flagCountMap = new Map(flagCounts.map((r) => [r.segmentId, r.flagCount]));
  }

  return {
    items: pageItems.map((s) => ({
      ...s,
      flagCount: flagCountMap.get(s.id) ?? 0,
    })),
    nextCursor:
      hasNextPage && last
        ? {
            value: nextCursorValue as string,
            id: last.id,
          }
        : null,
    total: total[0]?.count ?? 0,
  };
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
