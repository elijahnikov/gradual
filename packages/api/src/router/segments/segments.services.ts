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
  sql,
} from "@gradual/db";
import {
  environment,
  featureFlag,
  featureFlagEnvironment,
  featureFlagSegmentTarget,
  featureFlagTarget,
  segment,
} from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import type {
  CreateSegmentInput,
  DeleteSegmentInput,
  GetSegmentByKeyInput,
  ListFlagsBySegmentInput,
  ListSegmentsInput,
  UpdateSegmentInput,
} from "./segments.schemas";

export const getSegmentByKey = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetSegmentByKeyInput;
}) => {
  const { projectSlug, key } = input;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and: a }) =>
      a(
        eq(slug, projectSlug),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  const found = await ctx.db.query.segment.findFirst({
    where: (table, { eq: e, and: a, isNull: n }) =>
      a(
        e(table.key, key),
        e(table.projectId, foundProject.id),
        e(table.organizationId, ctx.organization.id),
        n(table.deletedAt)
      ),
  });

  if (!found) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Segment not found" });
  }

  // Count distinct flags using this segment
  const flagCounts = await ctx.db
    .select({
      flagCount: countDistinct(featureFlagEnvironment.featureFlagId),
    })
    .from(featureFlagSegmentTarget)
    .innerJoin(
      featureFlagTarget,
      eq(featureFlagSegmentTarget.targetId, featureFlagTarget.id)
    )
    .innerJoin(
      featureFlagEnvironment,
      eq(featureFlagTarget.featureFlagEnvironmentId, featureFlagEnvironment.id)
    )
    .where(eq(featureFlagSegmentTarget.segmentId, found.id));

  return {
    ...found,
    flagCount: flagCounts[0]?.flagCount ?? 0,
  };
};

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

export const updateSegment = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: UpdateSegmentInput;
}) => {
  const {
    segmentId,
    projectSlug,
    name,
    description,
    conditions,
    includedIndividuals,
    excludedIndividuals,
  } = input;

  const foundProject = await ctx.db.query.project.findFirst({
    where: (
      { slug, organizationId, deletedAt },
      { eq: e, isNull: n, and: a }
    ) =>
      a(
        e(slug, projectSlug),
        e(organizationId, ctx.organization.id),
        n(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  const existing = await ctx.db.query.segment.findFirst({
    where: (table, { eq: e, and: a, isNull: n }) =>
      a(
        e(table.id, segmentId),
        e(table.projectId, foundProject.id),
        e(table.organizationId, ctx.organization.id),
        n(table.deletedAt)
      ),
  });

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Segment not found" });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) {
    updates.name = name;
  }
  if (description !== undefined) {
    updates.description = description;
  }
  if (conditions !== undefined) {
    updates.conditions = conditions;
  }
  if (includedIndividuals !== undefined) {
    updates.includedIndividuals = includedIndividuals;
  }
  if (excludedIndividuals !== undefined) {
    updates.excludedIndividuals = excludedIndividuals;
  }

  if (Object.keys(updates).length === 0) {
    return existing;
  }

  const [updated] = await ctx.db
    .update(segment)
    .set(updates)
    .where(eq(segment.id, segmentId))
    .returning();

  return updated;
};

function getFlagsUsingSegment(
  db: ProtectedOrganizationTRPCContext["db"],
  segmentId: string
) {
  return db
    .selectDistinctOn([featureFlag.id], {
      id: featureFlag.id,
      name: featureFlag.name,
      key: featureFlag.key,
    })
    .from(featureFlagSegmentTarget)
    .innerJoin(
      featureFlagTarget,
      eq(featureFlagSegmentTarget.targetId, featureFlagTarget.id)
    )
    .innerJoin(
      featureFlagEnvironment,
      eq(featureFlagTarget.featureFlagEnvironmentId, featureFlagEnvironment.id)
    )
    .innerJoin(
      featureFlag,
      eq(featureFlagEnvironment.featureFlagId, featureFlag.id)
    )
    .where(eq(featureFlagSegmentTarget.segmentId, segmentId));
}

export const listFlagsBySegment = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: ListFlagsBySegmentInput;
}) => {
  const { segmentId, projectSlug } = input;

  const foundProject = await ctx.db.query.project.findFirst({
    where: (
      { slug, organizationId, deletedAt },
      { eq: e, isNull: n, and: a }
    ) =>
      a(
        e(slug, projectSlug),
        e(organizationId, ctx.organization.id),
        n(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  const rows = await ctx.db
    .select({
      flagId: featureFlag.id,
      flagName: featureFlag.name,
      flagKey: featureFlag.key,
      environmentName: environment.name,
      environmentSlug: environment.slug,
      environmentColor: environment.color,
    })
    .from(featureFlagSegmentTarget)
    .innerJoin(
      featureFlagTarget,
      eq(featureFlagSegmentTarget.targetId, featureFlagTarget.id)
    )
    .innerJoin(
      featureFlagEnvironment,
      eq(featureFlagTarget.featureFlagEnvironmentId, featureFlagEnvironment.id)
    )
    .innerJoin(
      featureFlag,
      eq(featureFlagEnvironment.featureFlagId, featureFlag.id)
    )
    .innerJoin(
      environment,
      eq(featureFlagEnvironment.environmentId, environment.id)
    )
    .where(eq(featureFlagSegmentTarget.segmentId, segmentId));

  const flagMap = new Map<
    string,
    {
      id: string;
      name: string;
      key: string;
      environments: { name: string; slug: string; color: string | null }[];
    }
  >();

  for (const row of rows) {
    let flag = flagMap.get(row.flagId);
    if (!flag) {
      flag = {
        id: row.flagId,
        name: row.flagName,
        key: row.flagKey,
        environments: [],
      };
      flagMap.set(row.flagId, flag);
    }
    flag.environments.push({
      name: row.environmentName,
      slug: row.environmentSlug,
      color: row.environmentColor,
    });
  }

  return [...flagMap.values()];
};

export const deleteSegment = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: DeleteSegmentInput;
}) => {
  const { segmentId, projectSlug } = input;

  const foundProject = await ctx.db.query.project.findFirst({
    where: (
      { slug, organizationId, deletedAt },
      { eq: e, isNull: n, and: a }
    ) =>
      a(
        e(slug, projectSlug),
        e(organizationId, ctx.organization.id),
        n(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  const existing = await ctx.db.query.segment.findFirst({
    where: (table, { eq: e, and: a, isNull: n }) =>
      a(
        e(table.id, segmentId),
        e(table.projectId, foundProject.id),
        e(table.organizationId, ctx.organization.id),
        n(table.deletedAt)
      ),
  });

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Segment not found" });
  }

  const flagsUsingSegment = await getFlagsUsingSegment(ctx.db, existing.id);

  if (flagsUsingSegment.length > 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Segment is in use by flags",
    });
  }

  // Soft delete
  await ctx.db
    .update(segment)
    .set({ deletedAt: sql`now()` })
    .where(eq(segment.id, segmentId));

  return { success: true };
};
