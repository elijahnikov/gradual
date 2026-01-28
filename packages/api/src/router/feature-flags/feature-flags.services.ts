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
  featureFlagEnvironment,
  featureFlagEvaluation,
  featureFlagVariation,
  organization,
  project,
  user,
} from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";

import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import type {
  CreateCompleteFeatureFlagInput,
  DeleteFlagsInput,
  GetFeatureFlagBreadcrumbInfoInput,
  GetFeatureFlagByKeyInput,
  GetFeatureFlagsByProjectAndOrganizationInput,
  GetPreviewEvaluationsInput,
  GetTargetingRulesInput,
  SeedEvaluationsInput,
} from "./feature-flags.schemas";

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

  return await ctx.db.transaction(async (tx) => {
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
      ...createdFlag,
      variations: createdVariations,
    };
  });
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

  // Fetch only the selected environments
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
    variations: variations.map((v) => ({ id: v.id, name: v.name })),
    totals,
    environments: environments.map((e) => ({ id: e.id, name: e.name })),
  };
};

const initializeHourlyStructures = (
  environments: Array<{ id: string; name: string }>,
  variations: Array<{ id: string; name: string }>
) => {
  const totals: Record<string, Record<string, number>> = {};
  for (const env of environments) {
    const envTotals: Record<string, number> = {};
    for (const variation of variations) {
      envTotals[variation.name] = 0;
    }
    totals[env.name] = envTotals;
  }
  return totals;
};

const processHourData = (
  hourDate: Date,
  evaluations: Array<{
    time: string;
    environmentId: string;
    variationId: string | null;
    count: number | bigint;
  }>,
  environments: Array<{ id: string; name: string }>,
  variations: Array<{ id: string; name: string }>,
  environmentMap: Map<string, string>,
  variationMap: Map<string, string>,
  totals: Record<string, Record<string, number>>
) => {
  const formattedTime = hourDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
  });

  const byEnvironment: Record<string, Record<string, number>> = {};
  for (const env of environments) {
    const envData: Record<string, number> = {};
    for (const variation of variations) {
      envData[variation.name] = 0;
    }
    byEnvironment[env.name] = envData;
  }

  const evaluationsForHour = evaluations.filter((e) => {
    const eDate = new Date(e.time);
    return eDate.getTime() === hourDate.getTime();
  });

  for (const evalEntry of evaluationsForHour) {
    const envName = environmentMap.get(evalEntry.environmentId);
    const varName = evalEntry.variationId
      ? variationMap.get(evalEntry.variationId)
      : null;

    if (envName && varName) {
      const c = Number(evalEntry.count);
      const envData = byEnvironment[envName];
      const envTotals = totals[envName];
      if (envData) {
        envData[varName] = c;
      }
      if (envTotals) {
        envTotals[varName] = (envTotals[varName] ?? 0) + c;
      }
    }
  }

  return { time: formattedTime, byEnvironment };
};

const transformEvaluationsToHourlyData = (
  evaluations: Array<{
    time: string;
    environmentId: string;
    variationId: string | null;
    count: number | bigint;
  }>,
  environments: Array<{ id: string; name: string }>,
  variations: Array<{ id: string; name: string }>,
  today: Date
) => {
  const environmentMap = new Map(environments.map((e) => [e.id, e.name]));
  const variationMap = new Map(variations.map((v) => [v.id, v.name]));

  const totals = initializeHourlyStructures(environments, variations);
  const hourlyData: Array<{
    time: string;
    byEnvironment: Record<string, Record<string, number>>;
  }> = [];

  for (let i = 23; i >= 0; i--) {
    const hourDate = new Date(today);
    hourDate.setHours(hourDate.getHours() - i, 0, 0, 0);
    const hourEntry = processHourData(
      hourDate,
      evaluations,
      environments,
      variations,
      environmentMap,
      variationMap,
      totals
    );
    hourlyData.push(hourEntry);
  }

  return { hourlyData, totals };
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
      targets: {
        orderBy: (target, { asc }) => asc(target.sortOrder),
        with: {
          variation: true,
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
