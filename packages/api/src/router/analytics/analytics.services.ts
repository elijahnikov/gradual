import { and, count, eq, gte, inArray, lt, or, sql } from "@gradual/db";
import {
  environment,
  featureFlag,
  featureFlagEvaluation,
  featureFlagVariation,
} from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";

import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import type {
  GetEnvironmentBreakdownInput,
  GetErrorRateInput,
  GetLatencyInput,
  GetOverviewInput,
  GetSdkPlatformBreakdownInput,
  GetTopFlagsInput,
  GetVariantDistributionInput,
  GetVolumeOverTimeInput,
} from "./analytics.schemas";

async function resolveProject(
  ctx: ProtectedOrganizationTRPCContext,
  projectSlug: string
): Promise<{ id: string; flagIds: string[] }> {
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

  const flags = await ctx.db
    .select({ id: featureFlag.id })
    .from(featureFlag)
    .where(eq(featureFlag.projectId, foundProject.id));

  return { id: foundProject.id, flagIds: flags.map((f) => f.id) };
}

function computeGranularity(
  startDate: Date,
  endDate: Date,
  granularity?: "hour" | "6hour" | "day"
): "hour" | "6hour" | "day" {
  if (granularity) {
    return granularity;
  }
  const rangeDays =
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  return rangeDays <= 1 ? "hour" : rangeDays <= 7 ? "6hour" : "day";
}

function alignBucketStart(
  date: Date,
  granularity: "hour" | "6hour" | "day"
): Date {
  const aligned = new Date(date);
  if (granularity === "day") {
    aligned.setUTCHours(0, 0, 0, 0);
  } else if (granularity === "6hour") {
    aligned.setUTCHours(Math.floor(aligned.getUTCHours() / 6) * 6, 0, 0, 0);
  } else {
    aligned.setUTCMinutes(0, 0, 0);
  }
  return aligned;
}

function buildProjectScope(projectId: string, projectFlagIds: string[]) {
  // Match evaluations that either have projectId set directly,
  // or belong to a flag in this project (for pre-migration rows)
  if (projectFlagIds.length === 0) {
    return eq(featureFlagEvaluation.projectId, projectId);
  }
  return or(
    eq(featureFlagEvaluation.projectId, projectId),
    inArray(featureFlagEvaluation.featureFlagId, projectFlagIds)
  );
}

function buildDateConditions(
  projectId: string,
  projectFlagIds: string[],
  startDate: Date,
  endDate: Date,
  environmentIds?: string[],
  flagIds?: string[]
) {
  const conditions = [
    buildProjectScope(projectId, projectFlagIds),
    gte(featureFlagEvaluation.createdAt, startDate),
    lt(featureFlagEvaluation.createdAt, endDate),
  ];

  if (environmentIds && environmentIds.length > 0) {
    conditions.push(
      inArray(featureFlagEvaluation.environmentId, environmentIds)
    );
  }

  if (flagIds && flagIds.length > 0) {
    conditions.push(inArray(featureFlagEvaluation.featureFlagId, flagIds));
  }

  return and(...conditions);
}

export async function getOverview({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetOverviewInput;
}) {
  const project = await resolveProject(ctx, input.projectSlug);
  const { startDate, endDate, environmentIds, flagIds } = input;

  if (project.flagIds.length === 0) {
    return {
      current: { totalEvaluations: 0, errorCount: 0, uniqueFlags: 0 },
      previous: { totalEvaluations: 0, errorCount: 0 },
    };
  }

  const periodDuration = endDate.getTime() - startDate.getTime();
  const previousStartDate = new Date(startDate.getTime() - periodDuration);
  const previousEndDate = startDate;

  const [current] = await ctx.db
    .select({
      totalEvaluations: count(),
      errorCount: count(featureFlagEvaluation.errorDetail),
      uniqueFlags: sql<number>`COUNT(DISTINCT ${featureFlagEvaluation.featureFlagId})`,
    })
    .from(featureFlagEvaluation)
    .where(
      buildDateConditions(
        project.id,
        project.flagIds,
        startDate,
        endDate,
        environmentIds,
        flagIds
      )
    );

  const [previous] = await ctx.db
    .select({
      totalEvaluations: count(),
      errorCount: count(featureFlagEvaluation.errorDetail),
    })
    .from(featureFlagEvaluation)
    .where(
      buildDateConditions(
        project.id,
        project.flagIds,
        previousStartDate,
        previousEndDate,
        environmentIds,
        flagIds
      )
    );

  return {
    current: {
      totalEvaluations: current?.totalEvaluations ?? 0,
      errorCount: current?.errorCount ?? 0,
      uniqueFlags: Number(current?.uniqueFlags ?? 0),
    },
    previous: {
      totalEvaluations: previous?.totalEvaluations ?? 0,
      errorCount: previous?.errorCount ?? 0,
    },
  };
}

export async function getVolumeOverTime({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetVolumeOverTimeInput;
}) {
  const project = await resolveProject(ctx, input.projectSlug);
  const { startDate, endDate, environmentIds, flagIds } = input;

  const effectiveGranularity = computeGranularity(
    startDate,
    endDate,
    input.granularity
  );
  const truncInterval = effectiveGranularity === "day" ? "day" : "hour";

  if (project.flagIds.length === 0) {
    return { data: [], granularity: effectiveGranularity };
  }

  const evaluations = await ctx.db
    .select({
      time: sql<string>`DATE_TRUNC('${sql.raw(truncInterval)}', ${featureFlagEvaluation.createdAt})`,
      count: count(),
    })
    .from(featureFlagEvaluation)
    .where(
      buildDateConditions(
        project.id,
        project.flagIds,
        startDate,
        endDate,
        environmentIds,
        flagIds
      )
    )
    .groupBy(
      sql`DATE_TRUNC('${sql.raw(truncInterval)}', ${featureFlagEvaluation.createdAt})`
    )
    .orderBy(
      sql`DATE_TRUNC('${sql.raw(truncInterval)}', ${featureFlagEvaluation.createdAt})`
    );

  const bucketMs =
    effectiveGranularity === "hour"
      ? 60 * 60 * 1000
      : effectiveGranularity === "6hour"
        ? 6 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;

  const evalMap = new Map(
    evaluations.map((e) => [new Date(e.time).getTime(), Number(e.count)])
  );

  const data: Array<{ time: string; count: number }> = [];
  let currentTime = alignBucketStart(startDate, effectiveGranularity);
  while (currentTime < endDate) {
    const timeKey = currentTime.getTime();
    data.push({
      time: currentTime.toISOString(),
      count: evalMap.get(timeKey) ?? 0,
    });
    currentTime = new Date(currentTime.getTime() + bucketMs);
  }

  return { data, granularity: effectiveGranularity };
}

export async function getVariantDistribution({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetVariantDistributionInput;
}) {
  const project = await resolveProject(ctx, input.projectSlug);
  const { startDate, endDate, environmentIds, flagIds } = input;

  if (project.flagIds.length === 0) {
    return { data: [], total: 0 };
  }

  const results = await ctx.db
    .select({
      variationId: featureFlagEvaluation.variationId,
      variationName: featureFlagVariation.name,
      variationColor: featureFlagVariation.color,
      count: count(),
    })
    .from(featureFlagEvaluation)
    .leftJoin(
      featureFlagVariation,
      eq(featureFlagEvaluation.variationId, featureFlagVariation.id)
    )
    .where(
      buildDateConditions(
        project.id,
        project.flagIds,
        startDate,
        endDate,
        environmentIds,
        flagIds
      )
    )
    .groupBy(
      featureFlagEvaluation.variationId,
      featureFlagVariation.name,
      featureFlagVariation.color
    )
    .orderBy(sql`count(*) DESC`);

  const total = results.reduce((sum, r) => sum + r.count, 0);

  return {
    data: results.map((r) => ({
      variationId: r.variationId,
      name: r.variationName ?? "Unknown",
      color: r.variationColor,
      count: r.count,
      percentage: total > 0 ? (r.count / total) * 100 : 0,
    })),
    total,
  };
}

export async function getEnvironmentBreakdown({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetEnvironmentBreakdownInput;
}) {
  const project = await resolveProject(ctx, input.projectSlug);
  const { startDate, endDate, environmentIds, flagIds } = input;

  if (project.flagIds.length === 0) {
    return { data: [], total: 0 };
  }

  const results = await ctx.db
    .select({
      environmentId: featureFlagEvaluation.environmentId,
      environmentName: environment.name,
      environmentColor: environment.color,
      count: count(),
    })
    .from(featureFlagEvaluation)
    .innerJoin(
      environment,
      eq(featureFlagEvaluation.environmentId, environment.id)
    )
    .where(
      buildDateConditions(
        project.id,
        project.flagIds,
        startDate,
        endDate,
        environmentIds,
        flagIds
      )
    )
    .groupBy(
      featureFlagEvaluation.environmentId,
      environment.name,
      environment.color
    )
    .orderBy(sql`count(*) DESC`);

  const total = results.reduce((sum, r) => sum + r.count, 0);

  return {
    data: results.map((r) => ({
      environmentId: r.environmentId,
      name: r.environmentName,
      color: r.environmentColor,
      count: r.count,
      percentage: total > 0 ? (r.count / total) * 100 : 0,
    })),
    total,
  };
}

export async function getSdkPlatformBreakdown({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetSdkPlatformBreakdownInput;
}) {
  const project = await resolveProject(ctx, input.projectSlug);
  const { startDate, endDate, environmentIds, flagIds } = input;

  if (project.flagIds.length === 0) {
    return { data: [], total: 0 };
  }

  const results = await ctx.db
    .select({
      platform: sql<string>`COALESCE(${featureFlagEvaluation.sdkPlatform}, 'unknown')`,
      count: count(),
    })
    .from(featureFlagEvaluation)
    .where(
      buildDateConditions(
        project.id,
        project.flagIds,
        startDate,
        endDate,
        environmentIds,
        flagIds
      )
    )
    .groupBy(sql`COALESCE(${featureFlagEvaluation.sdkPlatform}, 'unknown')`)
    .orderBy(sql`count(*) DESC`);

  const total = results.reduce((sum, r) => sum + r.count, 0);

  return {
    data: results.map((r) => ({
      platform: r.platform,
      count: r.count,
      percentage: total > 0 ? (r.count / total) * 100 : 0,
    })),
    total,
  };
}

export async function getTopFlags({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetTopFlagsInput;
}) {
  const project = await resolveProject(ctx, input.projectSlug);
  const { startDate, endDate, environmentIds, flagIds, limit } = input;

  if (project.flagIds.length === 0) {
    return { data: [] };
  }

  const results = await ctx.db
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
      buildDateConditions(
        project.id,
        project.flagIds,
        startDate,
        endDate,
        environmentIds,
        flagIds
      )
    )
    .groupBy(
      featureFlagEvaluation.featureFlagId,
      featureFlag.name,
      featureFlag.key
    )
    .orderBy(sql`count(*) DESC`)
    .limit(limit);

  return { data: results };
}

export async function getErrorRate({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetErrorRateInput;
}) {
  const project = await resolveProject(ctx, input.projectSlug);
  const { startDate, endDate, environmentIds, flagIds } = input;

  const effectiveGranularity = computeGranularity(
    startDate,
    endDate,
    input.granularity
  );
  const truncInterval = effectiveGranularity === "day" ? "day" : "hour";

  if (project.flagIds.length === 0) {
    return { data: [], granularity: effectiveGranularity };
  }

  const evaluations = await ctx.db
    .select({
      time: sql<string>`DATE_TRUNC('${sql.raw(truncInterval)}', ${featureFlagEvaluation.createdAt})`,
      total: count(),
      errors: count(featureFlagEvaluation.errorDetail),
    })
    .from(featureFlagEvaluation)
    .where(
      buildDateConditions(
        project.id,
        project.flagIds,
        startDate,
        endDate,
        environmentIds,
        flagIds
      )
    )
    .groupBy(
      sql`DATE_TRUNC('${sql.raw(truncInterval)}', ${featureFlagEvaluation.createdAt})`
    )
    .orderBy(
      sql`DATE_TRUNC('${sql.raw(truncInterval)}', ${featureFlagEvaluation.createdAt})`
    );

  const bucketMs =
    effectiveGranularity === "hour"
      ? 60 * 60 * 1000
      : effectiveGranularity === "6hour"
        ? 6 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;

  const evalMap = new Map(
    evaluations.map((e) => [
      new Date(e.time).getTime(),
      { total: e.total, errors: e.errors },
    ])
  );

  const data: Array<{ time: string; total: number; errors: number }> = [];
  let currentTime = alignBucketStart(startDate, effectiveGranularity);
  while (currentTime < endDate) {
    const timeKey = currentTime.getTime();
    const bucket = evalMap.get(timeKey);
    data.push({
      time: currentTime.toISOString(),
      total: bucket?.total ?? 0,
      errors: bucket?.errors ?? 0,
    });
    currentTime = new Date(currentTime.getTime() + bucketMs);
  }

  return { data, granularity: effectiveGranularity };
}

export async function getLatency({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetLatencyInput;
}) {
  const project = await resolveProject(ctx, input.projectSlug);
  const { startDate, endDate, environmentIds, flagIds } = input;

  const effectiveGranularity = computeGranularity(
    startDate,
    endDate,
    input.granularity
  );
  const truncInterval = effectiveGranularity === "day" ? "day" : "hour";

  if (project.flagIds.length === 0) {
    return { data: [], granularity: effectiveGranularity };
  }

  const evaluations = await ctx.db
    .select({
      time: sql<string>`DATE_TRUNC('${sql.raw(truncInterval)}', ${featureFlagEvaluation.createdAt})`,
      p50: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${featureFlagEvaluation.evaluationDurationUs})`,
      p95: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${featureFlagEvaluation.evaluationDurationUs})`,
      p99: sql<number>`PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ${featureFlagEvaluation.evaluationDurationUs})`,
    })
    .from(featureFlagEvaluation)
    .where(
      buildDateConditions(
        project.id,
        project.flagIds,
        startDate,
        endDate,
        environmentIds,
        flagIds
      )
    )
    .groupBy(
      sql`DATE_TRUNC('${sql.raw(truncInterval)}', ${featureFlagEvaluation.createdAt})`
    )
    .orderBy(
      sql`DATE_TRUNC('${sql.raw(truncInterval)}', ${featureFlagEvaluation.createdAt})`
    );

  const bucketMs =
    effectiveGranularity === "hour"
      ? 60 * 60 * 1000
      : effectiveGranularity === "6hour"
        ? 6 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;

  const evalMap = new Map(
    evaluations.map((e) => [
      new Date(e.time).getTime(),
      {
        p50: Number(e.p50),
        p95: Number(e.p95),
        p99: Number(e.p99),
      },
    ])
  );

  const data: Array<{
    time: string;
    p50: number | null;
    p95: number | null;
    p99: number | null;
  }> = [];
  let currentTime = alignBucketStart(startDate, effectiveGranularity);
  while (currentTime < endDate) {
    const timeKey = currentTime.getTime();
    const bucket = evalMap.get(timeKey);
    data.push({
      time: currentTime.toISOString(),
      p50: bucket?.p50 ?? null,
      p95: bucket?.p95 ?? null,
      p99: bucket?.p99 ?? null,
    });
    currentTime = new Date(currentTime.getTime() + bucketMs);
  }

  return { data, granularity: effectiveGranularity };
}
