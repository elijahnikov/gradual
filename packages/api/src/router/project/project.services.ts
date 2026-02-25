import { and, count, eq, gte, inArray, isNull, lt, sql } from "@gradual/db";
import {
  environment,
  featureFlag,
  featureFlagEvaluation,
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
  GetHomeSummaryInput,
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

export const getHomeSummary = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetHomeSummaryInput;
}) => {
  const foundProject = await ctx.db.query.project.findFirst({
    where: (table, { and: a, eq: e, isNull: n }) =>
      a(
        e(table.slug, input.projectSlug),
        e(table.organizationId, ctx.organization.id),
        n(table.deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const projectId = foundProject.id;

  // Get flag IDs for evaluation scoping (no projectId on evaluations table)
  const flags = await ctx.db
    .select({ id: featureFlag.id })
    .from(featureFlag)
    .where(eq(featureFlag.projectId, projectId));
  const flagIds = flags.map((f) => f.id);

  const hasFlags = flagIds.length > 0;

  const [
    flagCounts,
    environmentCount,
    currentEvals,
    previousEvals,
    recentFlags,
    volumeData,
    topFlagsData,
  ] = await Promise.all([
    ctx.db
      .select({
        total: count(),
        active: sql<number>`COUNT(*) FILTER (WHERE ${featureFlag.archivedAt} IS NULL)`,
      })
      .from(featureFlag)
      .where(
        and(
          eq(featureFlag.projectId, projectId),
          eq(featureFlag.organizationId, ctx.organization.id)
        )
      ),
    ctx.db
      .select({ total: count() })
      .from(environment)
      .where(
        and(
          eq(environment.projectId, projectId),
          eq(environment.organizationId, ctx.organization.id),
          isNull(environment.deletedAt)
        )
      ),
    hasFlags
      ? ctx.db
          .select({ total: count() })
          .from(featureFlagEvaluation)
          .where(
            and(
              inArray(featureFlagEvaluation.featureFlagId, flagIds),
              gte(featureFlagEvaluation.createdAt, twentyFourHoursAgo),
              lt(featureFlagEvaluation.createdAt, now)
            )
          )
      : Promise.resolve([{ total: 0 }]),
    hasFlags
      ? ctx.db
          .select({ total: count() })
          .from(featureFlagEvaluation)
          .where(
            and(
              inArray(featureFlagEvaluation.featureFlagId, flagIds),
              gte(featureFlagEvaluation.createdAt, fortyEightHoursAgo),
              lt(featureFlagEvaluation.createdAt, twentyFourHoursAgo)
            )
          )
      : Promise.resolve([{ total: 0 }]),
    ctx.db
      .select({
        id: featureFlag.id,
        name: featureFlag.name,
        key: featureFlag.key,
        updatedAt: featureFlag.updatedAt,
      })
      .from(featureFlag)
      .where(
        and(
          eq(featureFlag.projectId, projectId),
          eq(featureFlag.organizationId, ctx.organization.id),
          isNull(featureFlag.archivedAt)
        )
      )
      .orderBy(sql`${featureFlag.updatedAt} DESC`)
      .limit(5),
    // Volume over time (7 days, bucketed by day)
    hasFlags
      ? ctx.db
          .select({
            time: sql<string>`date_trunc('day', ${featureFlagEvaluation.createdAt})::text`,
            count: count(),
          })
          .from(featureFlagEvaluation)
          .where(
            and(
              inArray(featureFlagEvaluation.featureFlagId, flagIds),
              gte(featureFlagEvaluation.createdAt, sevenDaysAgo),
              lt(featureFlagEvaluation.createdAt, now)
            )
          )
          .groupBy(sql`date_trunc('day', ${featureFlagEvaluation.createdAt})`)
          .orderBy(sql`date_trunc('day', ${featureFlagEvaluation.createdAt})`)
      : Promise.resolve([]),
    // Top flags by evaluation count (24h)
    hasFlags
      ? ctx.db
          .select({
            flagId: featureFlagEvaluation.featureFlagId,
            flagName: featureFlag.name,
            flagKey: featureFlag.key,
            count: count(),
          })
          .from(featureFlagEvaluation)
          .innerJoin(
            featureFlag,
            eq(featureFlagEvaluation.featureFlagId, featureFlag.id)
          )
          .where(
            and(
              inArray(featureFlagEvaluation.featureFlagId, flagIds),
              gte(featureFlagEvaluation.createdAt, twentyFourHoursAgo),
              lt(featureFlagEvaluation.createdAt, now)
            )
          )
          .groupBy(
            featureFlagEvaluation.featureFlagId,
            featureFlag.name,
            featureFlag.key
          )
          .orderBy(sql`count(*) DESC`)
          .limit(5)
      : Promise.resolve([]),
  ]);

  return {
    totalFlags: flagCounts[0]?.total ?? 0,
    activeFlags: flagCounts[0]?.active ?? 0,
    totalEnvironments: environmentCount[0]?.total ?? 0,
    evaluations24h: {
      current: currentEvals[0]?.total ?? 0,
      previous: previousEvals[0]?.total ?? 0,
    },
    recentFlags,
    volumeOverTime: volumeData.map((d) => ({
      time: d.time,
      count: d.count,
    })),
    topFlags: topFlagsData.map((d) => ({
      flagId: d.flagId,
      flagName: d.flagName,
      flagKey: d.flagKey,
      count: d.count,
    })),
  };
};
