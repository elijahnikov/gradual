import {
  alias,
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lt,
  or,
  sql,
} from "@gradual/db";
import {
  featureFlag,
  featureFlagDefaultRollout,
  featureFlagDefaultRolloutVariation,
  featureFlagEnvironment,
  featureFlagEvaluation,
  featureFlagIndividualTarget,
  featureFlagRolloutVariation,
  featureFlagSegmentTarget,
  featureFlagTarget,
  featureFlagTargetingRule,
  featureFlagTargetRollout,
  featureFlagVariation,
  organization,
  project,
  user,
} from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";

import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import { ee } from "../evaluations/evaluations.emitter";
import { queueSnapshotPublish } from "../snapshots/snapshots.services";
import type {
  AddVariationInput,
  CreateCompleteFeatureFlagInput,
  DeleteFlagsInput,
  DeleteVariationInput,
  GetEventsInput,
  GetFeatureFlagBreadcrumbInfoInput,
  GetFeatureFlagByKeyInput,
  GetFeatureFlagsByProjectAndOrganizationInput,
  GetMetricsEvaluationsInput,
  GetPreviewEvaluationsInput,
  GetTargetingRulesInput,
  GetVariationsInput,
  SaveTargetingRulesInput,
  SeedEvaluationsInput,
  UpdateFeatureFlagInput,
  UpdateVariationInput,
  WatchEventsInput,
} from "./feature-flags.schemas";
import {
  transformEvaluationsToHourlyData,
  transformToMetricsData,
} from "./feature-flags.utils";

async function queueSnapshotsForAllEnvironments(
  ctx: ProtectedOrganizationTRPCContext,
  projectId: string
): Promise<void> {
  const environments = await ctx.db.query.environment.findMany({
    where: (
      { projectId: envProjectId, organizationId, deletedAt },
      { eq, and, isNull }
    ) =>
      and(
        eq(envProjectId, projectId),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  for (const env of environments) {
    queueSnapshotPublish({
      orgId: ctx.organization.id,
      projectId,
      environmentSlug: env.slug,
    }).catch((err) => {
      console.error(`Failed to queue snapshot publish for ${env.slug}:`, err);
    });
  }
}

export const getAllFeatureFlagsByProjectAndOrganization = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetFeatureFlagsByProjectAndOrganizationInput;
}) => {
  const { projectSlug, limit, cursor, sortBy, sortOrder, search } = input;

  const project = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(slug, projectSlug),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!project) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  const evaluationCountExpr = sql<number>`count(distinct ${featureFlagEvaluation.id})`;
  const evaluationCount = evaluationCountExpr.as("evaluation_count");

  const sortColumnMap = {
    createdAt: featureFlag.createdAt,
    updatedAt: featureFlag.updatedAt,
    evaluationCount,
  } as const;

  const baseWhereClauses = [
    eq(featureFlag.projectId, project.id),
    eq(featureFlag.organizationId, ctx.organization.id),
  ];

  if (search) {
    const searchPattern = `%${search}%`;
    baseWhereClauses.push(
      // biome-ignore lint/style/noNonNullAssertion: or() returns defined when given conditions
      or(
        ilike(featureFlag.name, searchPattern),
        ilike(featureFlag.key, searchPattern)
      )!
    );
  }

  const total = await ctx.db
    .select({ count: count() })
    .from(featureFlag)
    .where(and(...baseWhereClauses));

  const sortColumn = sortColumnMap[sortBy];
  const operator = sortOrder === "asc" ? gt : lt;

  const whereClauses = [...baseWhereClauses];

  const createdBy = alias(user, "created_by");
  const maintainer = alias(user, "maintainer");

  if (cursor && sortBy !== "evaluationCount") {
    const sortCol =
      sortBy === "createdAt" ? featureFlag.createdAt : featureFlag.updatedAt;
    const cursorDate = new Date(cursor.value as string);
    whereClauses.push(
      // biome-ignore lint/style/noNonNullAssertion: or() returns defined when given conditions
      or(
        operator(sortCol, cursorDate),
        and(eq(sortCol, cursorDate), operator(featureFlag.id, cursor.id))
      )!
    );
  }

  const havingCondition =
    cursor && sortBy === "evaluationCount"
      ? sql`(${evaluationCountExpr} ${sortOrder === "asc" ? sql`>` : sql`<`} ${cursor.value} OR (${evaluationCountExpr} = ${cursor.value} AND ${featureFlag.id} ${sortOrder === "asc" ? sql`>` : sql`<`} ${cursor.id}))`
      : undefined;

  const query = ctx.db
    .select({
      featureFlag,
      createdBy,
      maintainer,
      evaluationCount,
    })
    .from(featureFlag)
    .leftJoin(
      featureFlagEvaluation,
      eq(featureFlag.id, featureFlagEvaluation.featureFlagId)
    )
    .leftJoin(
      featureFlagVariation,
      eq(featureFlag.id, featureFlagVariation.featureFlagId)
    )
    .leftJoin(createdBy, eq(featureFlag.createdById, createdBy.id))
    .leftJoin(maintainer, eq(featureFlag.maintainerId, maintainer.id))
    .where(and(...whereClauses))
    .groupBy(featureFlag.id, createdBy.id, maintainer.id);

  const result = await (havingCondition
    ? query
        .having(havingCondition)
        .orderBy(
          sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn),
          sortOrder === "asc" ? asc(featureFlag.id) : desc(featureFlag.id)
        )
        .limit(limit + 1)
    : query
        .orderBy(
          sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn),
          sortOrder === "asc" ? asc(featureFlag.id) : desc(featureFlag.id)
        )
        .limit(limit + 1));

  const hasNextPage = result.length > limit;
  const items = hasNextPage ? result.slice(0, limit) : result;

  const last = items.at(-1);

  let nextCursorValue: string | number | null = null;
  if (hasNextPage && last) {
    if (sortBy === "evaluationCount") {
      nextCursorValue = last.evaluationCount;
    } else {
      // Convert Date to ISO string for date columns
      const dateValue = last.featureFlag[sortBy];
      nextCursorValue =
        dateValue instanceof Date ? dateValue.toISOString() : dateValue;
    }
  }

  return {
    items,
    nextCursor:
      hasNextPage && last
        ? {
            value: nextCursorValue as string | number,
            id: last.featureFlag.id,
          }
        : null,
    total: total[0]?.count ?? 0,
  };
};

export const createCompleteFeatureFlag = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: CreateCompleteFeatureFlagInput;
}) => {
  const {
    projectSlug,
    variations,
    defaultWhenOnVariationIndex,
    defaultWhenOffVariationIndex,
    ...flagData
  } = input;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(slug, projectSlug),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  const existingFlag = await ctx.db.query.featureFlag.findFirst({
    where: ({ key, projectId }, { eq, and }) =>
      and(eq(key, flagData.key), eq(projectId, foundProject.id)),
  });

  if (existingFlag) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `A feature flag with key "${flagData.key}" already exists in this project`,
    });
  }

  const result = await ctx.db.transaction(async (tx) => {
    const createdFlags = (await tx
      .insert(featureFlag)
      .values({
        ...flagData,
        projectId: foundProject.id,
        organizationId: ctx.organization.id,
        createdById: ctx.session.user.id,
        maintainerId: flagData.maintainerId,
      })
      .returning()) as Array<typeof featureFlag.$inferInsert & { id: string }>;

    const createdFlag = createdFlags[0];

    if (!createdFlag) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create feature flag",
      });
    }

    const createdVariations = (await tx
      .insert(featureFlagVariation)
      .values(
        variations.map((variation: (typeof variations)[number]) => ({
          featureFlagId: createdFlag.id,
          name: variation.name,
          value: variation.value,
          description: variation.description,
          color: variation.color,
          isDefault: variation.isDefault,
          rolloutPercentage: variation.rolloutPercentage,
          sortOrder: variation.sortOrder,
        }))
      )
      .returning()) as Array<{
      id: string;
      name: string;
      value: unknown;
      isDefault: boolean;
    }>;

    if (createdVariations.length === 0) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create feature flag variations",
      });
    }

    const defaultVariation = createdVariations.find((v) => v.isDefault);
    if (!defaultVariation) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No default variation found",
      });
    }

    const getVariationIndex = (
      requestedIndex: number | undefined,
      variations: Array<{ isDefault: boolean }>,
      defaultIdx: number
    ): number => {
      if (
        requestedIndex !== undefined &&
        requestedIndex >= 0 &&
        requestedIndex < variations.length
      ) {
        return requestedIndex;
      }
      return defaultIdx;
    };

    const defaultIndex = createdVariations.findIndex((v) => v.isDefault);
    const onVariationIndex = getVariationIndex(
      defaultWhenOnVariationIndex,
      createdVariations,
      defaultIndex
    );
    const offVariationIndex = getVariationIndex(
      defaultWhenOffVariationIndex,
      createdVariations,
      defaultIndex
    );

    const onVariation = createdVariations[onVariationIndex] ?? defaultVariation;
    const offVariation =
      createdVariations[offVariationIndex] ?? defaultVariation;

    const allEnvironments = await tx.query.environment.findMany({
      where: ({ projectId, organizationId, deletedAt }, { eq, isNull, and }) =>
        and(
          eq(projectId, foundProject.id),
          eq(organizationId, ctx.organization.id),
          isNull(deletedAt)
        ),
    });

    if (allEnvironments.length > 0) {
      await tx.insert(featureFlagEnvironment).values(
        allEnvironments.map((env) => ({
          featureFlagId: createdFlag.id,
          environmentId: env.id,
          enabled: false,
          defaultVariationId: onVariation.id,
          offVariationId: offVariation.id,
        }))
      );
    }

    return {
      flag: createdFlag,
      variations: createdVariations,
      environments: allEnvironments,
    };
  });

  for (const env of result.environments) {
    queueSnapshotPublish({
      orgId: ctx.organization.id,
      projectId: foundProject.id,
      environmentSlug: env.slug,
    }).catch((err) => {
      console.error(`Failed to queue snapshot for ${env.slug}:`, err);
    });
  }

  return {
    ...result.flag,
    variations: result.variations,
  };
};

export const getFeatureFlagByKey = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetFeatureFlagByKeyInput;
}) => {
  const { key, projectSlug } = input;

  const maintainer = alias(user, "maintainer");

  const [result] = await ctx.db
    .select({
      flag: {
        id: featureFlag.id,
        key: featureFlag.key,
        name: featureFlag.name,
        description: featureFlag.description,
        type: featureFlag.type,
        status: featureFlag.status,
        tags: featureFlag.tags,
        maintainerId: featureFlag.maintainerId,
        projectId: featureFlag.projectId,
        organizationId: featureFlag.organizationId,
        archivedAt: featureFlag.archivedAt,
        createdAt: featureFlag.createdAt,
        updatedAt: featureFlag.updatedAt,
      },
      maintainer: {
        id: maintainer.id,
        name: maintainer.name,
        email: maintainer.email,
        image: maintainer.image,
      },
    })
    .from(featureFlag)
    .innerJoin(project, eq(featureFlag.projectId, project.id))
    .innerJoin(organization, eq(featureFlag.organizationId, organization.id))
    .leftJoin(maintainer, eq(featureFlag.maintainerId, maintainer.id))
    .where(
      and(
        eq(featureFlag.key, key),
        eq(organization.slug, ctx.organization.slug),
        eq(project.slug, projectSlug),
        eq(featureFlag.organizationId, ctx.organization.id)
      )
    )
    .limit(1);

  if (!result) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Feature flag not found",
    });
  }

  const variations = await ctx.db
    .select({
      id: featureFlagVariation.id,
      name: featureFlagVariation.name,
      value: featureFlagVariation.value,
      description: featureFlagVariation.description,
      color: featureFlagVariation.color,
      isDefault: featureFlagVariation.isDefault,
      sortOrder: featureFlagVariation.sortOrder,
    })
    .from(featureFlagVariation)
    .where(eq(featureFlagVariation.featureFlagId, result.flag.id))
    .orderBy(featureFlagVariation.sortOrder);

  const environments = await ctx.db.query.featureFlagEnvironment.findMany({
    where: ({ featureFlagId }, { eq }) => eq(featureFlagId, result.flag.id),
    with: {
      environment: true,
    },
  });

  return {
    flag: result.flag,
    maintainer: result.maintainer,
    variations,
    environments,
    organization: ctx.organization,
    organizationMember: ctx.organizationMember,
  };
};

export const getFeatureFlagBreadcrumbInfo = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetFeatureFlagBreadcrumbInfoInput;
}) => {
  const { key, projectSlug } = input;

  const [foundFlag] = await ctx.db
    .select({
      name: featureFlag.name,
      key: featureFlag.key,
    })
    .from(featureFlag)
    .innerJoin(project, eq(featureFlag.projectId, project.id))
    .innerJoin(organization, eq(featureFlag.organizationId, organization.id))
    .where(
      and(
        eq(featureFlag.key, key),
        eq(organization.slug, ctx.organization.slug),
        eq(project.slug, projectSlug),
        eq(featureFlag.organizationId, ctx.organization.id)
      )
    )
    .limit(1);

  if (!foundFlag) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Feature flag not found",
    });
  }

  return foundFlag;
};

export const getPreviewEvaluations = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetPreviewEvaluationsInput;
}) => {
  const {
    flagId,
    organizationId: organizationIdToCheck,
    projectId,
    environmentIds,
  } = input;

  const foundFlag = await ctx.db.query.featureFlag.findFirst({
    where: ({ id, organizationId, projectId }, { eq, and }) =>
      and(
        eq(id, flagId),
        eq(organizationId, organizationIdToCheck),
        eq(projectId, projectId)
      ),
    with: {
      project: true,
    },
  });

  if (!foundFlag) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Feature flag not found",
    });
  }

  if (foundFlag.project.id !== projectId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Feature flag not found in the specified project",
    });
  }

  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24, 0, 0, 0);

  const environments = await ctx.db.query.environment.findMany({
    where: ({ id, projectId, deletedAt }, { eq, isNull, and, inArray }) =>
      and(
        inArray(id, environmentIds),
        eq(projectId, foundFlag.project.id),
        isNull(deletedAt)
      ),
    orderBy: (env, { asc }) => asc(env.createdAt),
  });

  const variations = await ctx.db.query.featureFlagVariation.findMany({
    where: (table, { eq }) => eq(table.featureFlagId, flagId),
  });

  const evaluations = await ctx.db
    .select({
      time: sql<string>`DATE_TRUNC('hour', ${featureFlagEvaluation.createdAt})`,
      environmentId: featureFlagEvaluation.environmentId,
      variationId: featureFlagEvaluation.variationId,
      count: count(),
    })
    .from(featureFlagEvaluation)
    .where(
      and(
        eq(featureFlagEvaluation.featureFlagId, flagId),
        inArray(featureFlagEvaluation.environmentId, environmentIds),
        gte(featureFlagEvaluation.createdAt, twentyFourHoursAgo)
      )
    )
    .groupBy(
      sql`DATE_TRUNC('hour', ${featureFlagEvaluation.createdAt})`,
      featureFlagEvaluation.environmentId,
      featureFlagEvaluation.variationId
    )
    .orderBy(sql`DATE_TRUNC('hour', ${featureFlagEvaluation.createdAt})`);

  const today = new Date();
  const { hourlyData, totals } = transformEvaluationsToHourlyData(
    evaluations,
    environments,
    variations,
    today
  );

  return {
    data: hourlyData,
    variations: variations.map((v) => ({
      id: v.id,
      name: v.name,
      color: v.color,
    })),
    totals,
    environments: environments.map((e) => ({ id: e.id, name: e.name })),
  };
};

export const seedEvaluations = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: SeedEvaluationsInput;
}) => {
  const { flagId, organizationId, count: totalToInsert } = input;

  const flag = await ctx.db.query.featureFlag.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.id, flagId), eq(table.organizationId, organizationId)),
    with: {
      variations: true,
      environments: {
        with: {
          environment: true,
        },
      },
    },
  });

  if (!flag) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Feature flag not found",
    });
  }

  const variations = flag.variations;
  const envs = flag.environments.map((fe) => fe.environmentId);

  if (variations.length === 0 || envs.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Flag must have variations and environments to seed data",
    });
  }

  const getRandomElement = <T>(arr: T[]): T => {
    const element = arr[Math.floor(Math.random() * arr.length)];
    if (element === undefined) {
      throw new Error("Array is empty");
    }
    return element;
  };

  const userAgents = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  ];

  const ips = ["192.168.1.1", "10.0.0.5", "172.16.0.10", "8.8.8.8", "1.1.1.1"];

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const evaluationValues: (typeof featureFlagEvaluation.$inferInsert)[] = [];
  for (let i = 0; i < totalToInsert; i++) {
    const variation = getRandomElement(variations);
    const environmentId = getRandomElement(envs);

    const createdAt = new Date(
      twentyFourHoursAgo.getTime() +
        Math.random() * (now.getTime() - twentyFourHoursAgo.getTime())
    );

    evaluationValues.push({
      featureFlagId: flagId,
      environmentId,
      variationId: variation.id,
      value: variation.value,
      context: { userId: `user_${Math.floor(Math.random() * 5000)}` },
      ipAddress: getRandomElement(ips),
      userAgent: getRandomElement(userAgents),
      reason: "seeded",
      createdAt,
    });
  }

  await ctx.db.insert(featureFlagEvaluation).values(evaluationValues);

  return { success: true, inserted: totalToInsert };
};

export const deleteFlags = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: DeleteFlagsInput;
}) => {
  const { flagIds } = input;

  const project = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(slug, input.projectSlug),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!project) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  await ctx.db
    .delete(featureFlag)
    .where(
      and(
        inArray(featureFlag.id, flagIds),
        eq(featureFlag.organizationId, ctx.organization.id),
        eq(featureFlag.projectId, project.id)
      )
    );

  queueSnapshotsForAllEnvironments(ctx, project.id);

  return { success: true, deleted: flagIds.length };
};

export const getTargetingRules = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetTargetingRulesInput;
}) => {
  const { flagId, environmentSlug, projectSlug } = input;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(slug, projectSlug),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  const foundEnvironment = await ctx.db.query.environment.findFirst({
    where: ({ slug, projectId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(slug, environmentSlug),
        eq(projectId, foundProject.id),
        isNull(deletedAt)
      ),
  });

  if (!foundEnvironment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Environment not found",
    });
  }

  const flagEnvironment = await ctx.db.query.featureFlagEnvironment.findFirst({
    where: ({ featureFlagId, environmentId }, { eq, and }) =>
      and(eq(featureFlagId, flagId), eq(environmentId, foundEnvironment.id)),
    with: {
      defaultVariation: true,
      defaultRollout: {
        with: {
          variations: {
            orderBy: (rv, { asc }) => asc(rv.sortOrder),
            with: {
              variation: true,
            },
          },
        },
      },
      targets: {
        orderBy: (target, { asc }) => asc(target.sortOrder),
        with: {
          variation: true,
          rules: {
            orderBy: (rule, { asc }) => asc(rule.sortOrder),
          },
          individual: true,
          segment: true,
          rollout: {
            with: {
              variations: {
                orderBy: (rv, { asc }) => asc(rv.sortOrder),
                with: {
                  variation: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!flagEnvironment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Flag environment configuration not found",
    });
  }

  return flagEnvironment;
};

export const saveTargetingRules = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: SaveTargetingRulesInput;
}) => {
  const {
    flagId,
    environmentSlug,
    projectSlug,
    targets,
    defaultVariationId,
    defaultRollout,
  } = input;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(slug, projectSlug),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  const foundEnvironment = await ctx.db.query.environment.findFirst({
    where: ({ slug, projectId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(slug, environmentSlug),
        eq(projectId, foundProject.id),
        isNull(deletedAt)
      ),
  });

  if (!foundEnvironment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Environment not found",
    });
  }

  const flagEnvironment = await ctx.db.query.featureFlagEnvironment.findFirst({
    where: ({ featureFlagId, environmentId }, { eq, and }) =>
      and(eq(featureFlagId, flagId), eq(environmentId, foundEnvironment.id)),
  });

  if (!flagEnvironment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Flag environment configuration not found",
    });
  }

  const result = await ctx.db.transaction(async (tx) => {
    await tx
      .delete(featureFlagTarget)
      .where(
        eq(featureFlagTarget.featureFlagEnvironmentId, flagEnvironment.id)
      );

    await tx
      .delete(featureFlagDefaultRollout)
      .where(
        eq(featureFlagDefaultRollout.flagEnvironmentId, flagEnvironment.id)
      );

    if (defaultRollout) {
      await tx
        .update(featureFlagEnvironment)
        .set({ defaultVariationId: null })
        .where(eq(featureFlagEnvironment.id, flagEnvironment.id));

      const [insertedDefaultRollout] = await tx
        .insert(featureFlagDefaultRollout)
        .values({
          flagEnvironmentId: flagEnvironment.id,
          bucketContextKind: defaultRollout.bucketContextKind,
          bucketAttributeKey: defaultRollout.bucketAttributeKey,
          seed: defaultRollout.seed,
        })
        .returning();

      if (insertedDefaultRollout) {
        for (let i = 0; i < defaultRollout.variations.length; i++) {
          const rv = defaultRollout.variations[i];
          if (rv) {
            await tx.insert(featureFlagDefaultRolloutVariation).values({
              defaultRolloutId: insertedDefaultRollout.id,
              variationId: rv.variationId,
              weight: rv.weight,
              sortOrder: i,
            });
          }
        }
      }
    } else if (defaultVariationId) {
      await tx
        .update(featureFlagEnvironment)
        .set({ defaultVariationId })
        .where(eq(featureFlagEnvironment.id, flagEnvironment.id));
    }

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      if (!target) {
        continue;
      }

      const [insertedTarget] = await tx
        .insert(featureFlagTarget)
        .values({
          name: target.name,
          featureFlagEnvironmentId: flagEnvironment.id,
          variationId: target.variationId ?? null,
          type: target.type,
          sortOrder: i,
        })
        .returning();

      if (!insertedTarget) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create target",
        });
      }

      if (target.rollout) {
        const [insertedRollout] = await tx
          .insert(featureFlagTargetRollout)
          .values({
            targetId: insertedTarget.id,
            bucketContextKind: target.rollout.bucketContextKind,
            bucketAttributeKey: target.rollout.bucketAttributeKey,
            seed: target.rollout.seed,
          })
          .returning();

        if (insertedRollout) {
          for (let j = 0; j < target.rollout.variations.length; j++) {
            const rv = target.rollout.variations[j];
            if (rv) {
              await tx.insert(featureFlagRolloutVariation).values({
                rolloutId: insertedRollout.id,
                variationId: rv.variationId,
                weight: rv.weight,
                sortOrder: j,
              });
            }
          }
        }
      }

      switch (target.type) {
        case "rule":
          if (target.conditions && target.conditions.length > 0) {
            for (let j = 0; j < target.conditions.length; j++) {
              const condition = target.conditions[j];
              if (condition) {
                await tx.insert(featureFlagTargetingRule).values({
                  targetId: insertedTarget.id,
                  contextKind: condition.contextKind,
                  attributeKey: condition.attributeKey,
                  operator: condition.operator,
                  value: condition.value,
                  sortOrder: j,
                });
              }
            }
          }
          break;

        case "individual":
          if (
            target.contextKind &&
            target.attributeKey &&
            target.attributeValue !== undefined
          ) {
            await tx.insert(featureFlagIndividualTarget).values({
              targetId: insertedTarget.id,
              contextKind: target.contextKind,
              attributeKey: target.attributeKey,
              attributeValue: target.attributeValue,
            });
          }
          break;

        case "segment":
          if (target.segmentId) {
            await tx.insert(featureFlagSegmentTarget).values({
              targetId: insertedTarget.id,
              segmentId: target.segmentId,
            });
          }
          break;

        default:
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid target type",
          });
      }
    }

    return { success: true, targetCount: targets.length };
  });

  queueSnapshotPublish({
    orgId: ctx.organization.id,
    projectId: foundProject.id,
    environmentSlug,
  }).catch((err) => {
    console.error("Failed to queue snapshot publish:", err);
  });

  return result;
};

export const updateFeatureFlag = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: UpdateFeatureFlagInput;
}) => {
  const { flagId, projectSlug, name, description, maintainerId } = input;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(slug, projectSlug),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  const existingFlag = await ctx.db.query.featureFlag.findFirst({
    where: ({ id, projectId }, { eq, and }) =>
      and(eq(id, flagId), eq(projectId, foundProject.id)),
  });

  if (!existingFlag) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Feature flag not found",
    });
  }

  const updateData: Partial<typeof featureFlag.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (name !== undefined) {
    updateData.name = name;
  }
  if (description !== undefined) {
    updateData.description = description;
  }
  if (maintainerId !== undefined) {
    updateData.maintainerId = maintainerId;
  }

  const [updatedFlag] = await ctx.db
    .update(featureFlag)
    .set(updateData)
    .where(eq(featureFlag.id, flagId))
    .returning();

  return updatedFlag;
};

export const getVariations = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetVariationsInput;
}) => {
  const { flagId, projectSlug } = input;
  const { organization } = ctx;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(slug, projectSlug),
        eq(organizationId, organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  const foundFlag = await ctx.db.query.featureFlag.findFirst({
    where: ({ id, projectId }, { eq, and }) =>
      and(eq(id, flagId), eq(projectId, foundProject.id)),
  });

  if (!foundFlag) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Feature flag not found",
    });
  }

  const evaluationCountSubquery = ctx.db
    .select({
      variationId: featureFlagEvaluation.variationId,
      count: count().as("count"),
    })
    .from(featureFlagEvaluation)
    .where(eq(featureFlagEvaluation.featureFlagId, foundFlag.id))
    .groupBy(featureFlagEvaluation.variationId)
    .as("evaluation_counts");

  const variations = await ctx.db
    .select({
      id: featureFlagVariation.id,
      featureFlagId: featureFlagVariation.featureFlagId,
      name: featureFlagVariation.name,
      value: featureFlagVariation.value,
      description: featureFlagVariation.description,
      color: featureFlagVariation.color,
      isDefault: featureFlagVariation.isDefault,
      rolloutPercentage: featureFlagVariation.rolloutPercentage,
      sortOrder: featureFlagVariation.sortOrder,
      createdAt: featureFlagVariation.createdAt,
      updatedAt: featureFlagVariation.updatedAt,
      evaluationCount: sql<number>`COALESCE(${evaluationCountSubquery.count}, 0)`,
    })
    .from(featureFlagVariation)
    .leftJoin(
      evaluationCountSubquery,
      eq(featureFlagVariation.id, evaluationCountSubquery.variationId)
    )
    .where(eq(featureFlagVariation.featureFlagId, foundFlag.id))
    .orderBy(featureFlagVariation.sortOrder);

  return variations;
};

export const updateVariation = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: UpdateVariationInput;
}) => {
  const { variationId, flagId, projectSlug, name, value, description, color } =
    input;
  const { organization: org } = ctx;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(eq(slug, projectSlug), eq(organizationId, org.id), isNull(deletedAt)),
  });

  if (!foundProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  const foundFlag = await ctx.db.query.featureFlag.findFirst({
    where: ({ id, projectId }, { eq, and }) =>
      and(eq(id, flagId), eq(projectId, foundProject.id)),
  });

  if (!foundFlag) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Feature flag not found",
    });
  }

  const foundVariation = await ctx.db.query.featureFlagVariation.findFirst({
    where: ({ id, featureFlagId }, { eq, and }) =>
      and(eq(id, variationId), eq(featureFlagId, foundFlag.id)),
  });

  if (!foundVariation) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Variation not found",
    });
  }

  const updateData: Partial<{
    name: string;
    value: unknown;
    description: string | null;
    color: string | null;
  }> = {};

  if (name !== undefined) {
    updateData.name = name;
  }
  if (value !== undefined) {
    updateData.value = value;
  }
  if (description !== undefined) {
    updateData.description = description;
  }
  if (color !== undefined) {
    updateData.color = color;
  }

  if (Object.keys(updateData).length === 0) {
    return foundVariation;
  }

  const [updatedVariation] = await ctx.db
    .update(featureFlagVariation)
    .set(updateData)
    .where(eq(featureFlagVariation.id, variationId))
    .returning();

  queueSnapshotsForAllEnvironments(ctx, foundProject.id);

  return updatedVariation;
};

export const addVariation = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: AddVariationInput;
}) => {
  const { flagId, projectSlug, name, value, description, color } = input;
  const { organization: org } = ctx;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(eq(slug, projectSlug), eq(organizationId, org.id), isNull(deletedAt)),
  });

  if (!foundProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  const foundFlag = await ctx.db.query.featureFlag.findFirst({
    where: ({ id, projectId }, { eq, and }) =>
      and(eq(id, flagId), eq(projectId, foundProject.id)),
  });

  if (!foundFlag) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Feature flag not found",
    });
  }

  if (foundFlag.type === "boolean") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot add variations to boolean flags",
    });
  }

  const existingVariations = await ctx.db.query.featureFlagVariation.findMany({
    where: ({ featureFlagId }, { eq }) => eq(featureFlagId, foundFlag.id),
    orderBy: ({ sortOrder }, { desc }) => desc(sortOrder),
    limit: 1,
  });

  const nextSortOrder =
    existingVariations.length > 0
      ? (existingVariations[0]?.sortOrder ?? 0) + 1
      : 0;

  const [newVariation] = await ctx.db
    .insert(featureFlagVariation)
    .values({
      featureFlagId: foundFlag.id,
      name,
      value,
      description: description ?? null,
      color: color ?? null,
      isDefault: false,
      rolloutPercentage: 0,
      sortOrder: nextSortOrder,
    })
    .returning();

  queueSnapshotsForAllEnvironments(ctx, foundProject.id);

  return newVariation;
};

export const deleteVariation = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: DeleteVariationInput;
}) => {
  const { variationId, flagId, projectSlug } = input;
  const { organization: org } = ctx;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(eq(slug, projectSlug), eq(organizationId, org.id), isNull(deletedAt)),
  });

  if (!foundProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  const foundFlag = await ctx.db.query.featureFlag.findFirst({
    where: ({ id, projectId }, { eq, and }) =>
      and(eq(id, flagId), eq(projectId, foundProject.id)),
  });

  if (!foundFlag) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Feature flag not found",
    });
  }

  if (foundFlag.type === "boolean") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot delete variations from boolean flags",
    });
  }

  const foundVariation = await ctx.db.query.featureFlagVariation.findFirst({
    where: ({ id, featureFlagId }, { eq, and }) =>
      and(eq(id, variationId), eq(featureFlagId, foundFlag.id)),
  });

  if (!foundVariation) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Variation not found",
    });
  }

  const allVariations = await ctx.db.query.featureFlagVariation.findMany({
    where: ({ featureFlagId }, { eq }) => eq(featureFlagId, foundFlag.id),
  });

  if (allVariations.length <= 2) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Cannot delete variation. Flags must have at least 2 variations.",
    });
  }

  if (foundVariation.isDefault) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot delete the default variation",
    });
  }

  await ctx.db
    .delete(featureFlagVariation)
    .where(eq(featureFlagVariation.id, variationId));

  queueSnapshotsForAllEnvironments(ctx, foundProject.id);

  return { success: true };
};

export const getMetricsEvaluations = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetMetricsEvaluationsInput;
}) => {
  const {
    flagId,
    projectSlug,
    environmentIds,
    startDate,
    endDate,
    granularity,
  } = input;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(slug, projectSlug),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  const foundFlag = await ctx.db.query.featureFlag.findFirst({
    where: ({ id, projectId, organizationId }, { eq, and }) =>
      and(
        eq(id, flagId),
        eq(projectId, foundProject.id),
        eq(organizationId, ctx.organization.id)
      ),
  });

  if (!foundFlag) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Feature flag not found",
    });
  }

  const rangeDays =
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const effectiveGranularity =
    granularity ?? (rangeDays <= 1 ? "hour" : rangeDays <= 7 ? "6hour" : "day");

  const truncInterval = effectiveGranularity === "day" ? "day" : "hour";

  const environments = await ctx.db.query.environment.findMany({
    where: ({ id, projectId, deletedAt }, { eq, isNull, and, inArray }) =>
      and(
        inArray(id, environmentIds),
        eq(projectId, foundProject.id),
        isNull(deletedAt)
      ),
    orderBy: (env, { asc }) => asc(env.createdAt),
  });

  const variations = await ctx.db.query.featureFlagVariation.findMany({
    where: (table, { eq }) => eq(table.featureFlagId, flagId),
    orderBy: (v, { asc }) => asc(v.sortOrder),
  });

  const evaluations = await ctx.db
    .select({
      time: sql<string>`DATE_TRUNC('${sql.raw(truncInterval)}', ${featureFlagEvaluation.createdAt})`,
      environmentId: featureFlagEvaluation.environmentId,
      variationId: featureFlagEvaluation.variationId,
      count: count(),
    })
    .from(featureFlagEvaluation)
    .where(
      and(
        eq(featureFlagEvaluation.featureFlagId, flagId),
        inArray(featureFlagEvaluation.environmentId, environmentIds),
        gte(featureFlagEvaluation.createdAt, startDate),
        lt(featureFlagEvaluation.createdAt, endDate)
      )
    )
    .groupBy(
      sql`DATE_TRUNC('${sql.raw(truncInterval)}', ${featureFlagEvaluation.createdAt})`,
      featureFlagEvaluation.environmentId,
      featureFlagEvaluation.variationId
    )
    .orderBy(
      sql`DATE_TRUNC('${sql.raw(truncInterval)}', ${featureFlagEvaluation.createdAt})`
    );

  const data = transformToMetricsData(
    evaluations,
    environments,
    variations,
    startDate,
    endDate,
    effectiveGranularity
  );

  const totals: Record<string, number> = {};
  for (const variation of variations) {
    totals[variation.id] = 0;
  }
  for (const evalEntry of evaluations) {
    if (evalEntry.variationId) {
      totals[evalEntry.variationId] =
        (totals[evalEntry.variationId] ?? 0) + Number(evalEntry.count);
    }
  }

  const periodDuration = endDate.getTime() - startDate.getTime();
  const previousStartDate = new Date(startDate.getTime() - periodDuration);
  const previousEndDate = new Date(startDate);

  const previousEvaluations = await ctx.db
    .select({
      variationId: featureFlagEvaluation.variationId,
      count: count(),
    })
    .from(featureFlagEvaluation)
    .where(
      and(
        eq(featureFlagEvaluation.featureFlagId, flagId),
        inArray(featureFlagEvaluation.environmentId, environmentIds),
        gte(featureFlagEvaluation.createdAt, previousStartDate),
        lt(featureFlagEvaluation.createdAt, previousEndDate)
      )
    )
    .groupBy(featureFlagEvaluation.variationId);

  const previousTotals: Record<string, number> = {};
  for (const variation of variations) {
    previousTotals[variation.id] = 0;
  }
  for (const evalEntry of previousEvaluations) {
    if (evalEntry.variationId) {
      previousTotals[evalEntry.variationId] =
        (previousTotals[evalEntry.variationId] ?? 0) + Number(evalEntry.count);
    }
  }

  return {
    data,
    variations: variations.map((v) => ({
      id: v.id,
      name: v.name,
      color: v.color,
    })),
    environments: environments.map((e) => ({ id: e.id, name: e.name })),
    totals,
    previousTotals,
    granularity: effectiveGranularity,
    startDate,
    endDate,
  };
};

export const getEvents = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetEventsInput;
}) => {
  const { flagId, projectSlug, environmentId, limit, cursor } = input;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq: e, isNull, and: a }) =>
      a(
        e(slug, projectSlug),
        e(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  const foundFlag = await ctx.db.query.featureFlag.findFirst({
    where: ({ id, projectId, organizationId }, { eq: e, and: a }) =>
      a(
        e(id, flagId),
        e(projectId, foundProject.id),
        e(organizationId, ctx.organization.id)
      ),
  });

  if (!foundFlag) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Feature flag not found",
    });
  }

  const conditions = [
    eq(featureFlagEvaluation.featureFlagId, flagId),
    eq(featureFlagEvaluation.environmentId, environmentId),
  ];

  if (cursor) {
    conditions.push(lt(featureFlagEvaluation.id, cursor));
  }

  const evaluations = await ctx.db
    .select({
      id: featureFlagEvaluation.id,
      variationId: featureFlagEvaluation.variationId,
      value: featureFlagEvaluation.value,
      reason: featureFlagEvaluation.reason,
      sdkVersion: featureFlagEvaluation.sdkVersion,
      userAgent: featureFlagEvaluation.userAgent,
      createdAt: featureFlagEvaluation.createdAt,
      matchedTargetName: featureFlagEvaluation.matchedTargetName,
      flagConfigVersion: featureFlagEvaluation.flagConfigVersion,
      sdkPlatform: featureFlagEvaluation.sdkPlatform,
      errorDetail: featureFlagEvaluation.errorDetail,
      evaluationDurationUs: featureFlagEvaluation.evaluationDurationUs,
      isAnonymous: featureFlagEvaluation.isAnonymous,
    })
    .from(featureFlagEvaluation)
    .where(and(...conditions))
    .orderBy(desc(featureFlagEvaluation.createdAt))
    .limit(limit + 1);

  const hasMore = evaluations.length > limit;
  const items = hasMore ? evaluations.slice(0, limit) : evaluations;
  const nextCursor = hasMore ? items.at(-1)?.id : undefined;

  const variationIds = [
    ...new Set(items.map((e) => e.variationId).filter(Boolean)),
  ] as string[];

  let variationMap = new Map<string, string>();
  if (variationIds.length > 0) {
    const variations = await ctx.db
      .select({
        id: featureFlagVariation.id,
        name: featureFlagVariation.name,
      })
      .from(featureFlagVariation)
      .where(inArray(featureFlagVariation.id, variationIds));

    variationMap = new Map(variations.map((v) => [v.id, v.name]));
  }

  return {
    items: items.map((e) => ({
      ...e,
      variationName: e.variationId
        ? (variationMap.get(e.variationId) ?? null)
        : null,
    })),
    nextCursor,
  };
};

export interface WatchEventItem {
  id: string;
  variationId: string | null;
  value: unknown;
  reason: string | null;
  sdkVersion: string | null;
  userAgent: string | null;
  createdAt: Date;
  matchedTargetName: string | null;
  flagConfigVersion: number | null;
  sdkPlatform: string | null;
  errorDetail: string | null;
  evaluationDurationUs: number | null;
  isAnonymous: boolean | null;
  variationName: string | null;
}

export async function* watchEvents({
  ctx,
  input,
  signal,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: WatchEventsInput;
  signal: AbortSignal | undefined;
}) {
  const { flagId, projectSlug, environmentId } = input;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq: e, isNull, and: a }) =>
      a(
        e(slug, projectSlug),
        e(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  const foundFlag = await ctx.db.query.featureFlag.findFirst({
    where: ({ id, projectId, organizationId }, { eq: e, and: a }) =>
      a(
        e(id, flagId),
        e(projectId, foundProject.id),
        e(organizationId, ctx.organization.id)
      ),
  });

  if (!foundFlag) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Feature flag not found",
    });
  }

  // Pre-load variations for this flag so we can resolve names without per-event queries
  const flagVariations = await ctx.db
    .select({
      id: featureFlagVariation.id,
      name: featureFlagVariation.name,
    })
    .from(featureFlagVariation)
    .where(eq(featureFlagVariation.featureFlagId, flagId));

  const variationMap = new Map(flagVariations.map((v) => [v.id, v.name]));

  // Subscribe to the event emitter — events are pushed instantly when evaluations are ingested
  const iterable = ee.toIterable("add", { signal });

  for await (const [event] of iterable) {
    // Filter to only events for this flag + environment
    if (
      event.featureFlagId !== flagId ||
      event.environmentId !== environmentId
    ) {
      continue;
    }

    const item: WatchEventItem = {
      id: event.id,
      variationId: event.variationId,
      value: event.value,
      reason: event.reason,
      sdkVersion: event.sdkVersion,
      userAgent: event.userAgent,
      createdAt: event.createdAt,
      matchedTargetName: event.matchedTargetName,
      flagConfigVersion: event.flagConfigVersion,
      sdkPlatform: event.sdkPlatform,
      errorDetail: event.errorDetail,
      evaluationDurationUs: event.evaluationDurationUs,
      isAnonymous: event.isAnonymous,
      variationName: event.variationId
        ? (variationMap.get(event.variationId) ?? null)
        : null,
    };

    yield item;
  }
}
