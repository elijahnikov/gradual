import { and, eq } from "@gradual/db";
import {
  environment,
  featureFlag,
  featureFlagEnvironment,
  featureFlagEvaluation,
  featureFlagVariation,
  organization,
  project,
} from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import { count, desc } from "drizzle-orm";
import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import type {
  CreateCompleteFeatureFlagInput,
  GetFeatureFlagBreadcrumbInfoInput,
  GetFeatureFlagByKeyInput,
  GetFeatureFlagsByProjectAndOrganizationInput,
  InsertFakeEvaluationsInput,
} from "./feature-flags.schemas";

export const getAllFeatureFlagsByProjectAndOrganization = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetFeatureFlagsByProjectAndOrganizationInput;
}) => {
  const { projectSlug } = input;

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

  const total = await ctx.db
    .select({ count: count() })
    .from(featureFlag)
    .where(
      and(
        eq(featureFlag.projectId, project.id),
        eq(featureFlag.organizationId, ctx.organization.id)
      )
    );

  const result = await ctx.db.query.featureFlag.findMany({
    where: ({ projectId, organizationId }, { eq, and }) =>
      and(eq(projectId, project.id), eq(organizationId, ctx.organization.id)),
    with: {
      maintainer: true,
      creator: true,
    },
    orderBy: desc(featureFlag.createdAt),
  });

  return {
    data: result,
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

  const [foundFlag] = await ctx.db
    .select({
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
    .where(eq(featureFlagVariation.featureFlagId, foundFlag.id))
    .orderBy(featureFlagVariation.sortOrder);

  const environmentConfigsRaw = await ctx.db
    .select({
      id: featureFlagEnvironment.id,
      environmentId: featureFlagEnvironment.environmentId,
      enabled: featureFlagEnvironment.enabled,
      defaultVariationId: featureFlagEnvironment.defaultVariationId,
      envId: environment.id,
      envName: environment.name,
      envSlug: environment.slug,
      envColor: environment.color,
    })
    .from(featureFlagEnvironment)
    .innerJoin(
      environment,
      eq(featureFlagEnvironment.environmentId, environment.id)
    )
    .where(eq(featureFlagEnvironment.featureFlagId, foundFlag.id));

  const environmentConfigs = environmentConfigsRaw.map((config) => ({
    id: config.id,
    environmentId: config.environmentId,
    enabled: config.enabled,
    defaultVariationId: config.defaultVariationId,
    environment: {
      id: config.envId,
      name: config.envName,
      slug: config.envSlug,
      color: config.envColor,
    },
  }));

  return {
    flag: foundFlag,
    variations,
    environmentConfigs,
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

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
  "Mozilla/5.0 (Android 12; Mobile; rv:109.0) Gecko/109.0",
] as const;

const COUNTRIES = [
  "US",
  "GB",
  "CA",
  "AU",
  "DE",
  "FR",
  "JP",
  "BR",
  "IN",
  "CN",
] as const;
const PLANS = ["free", "basic", "pro", "enterprise"] as const;
const DEVICES = ["desktop", "mobile", "tablet"] as const;
const OS = ["Windows", "macOS", "Linux", "iOS", "Android"] as const;

function getRandomItem<T>(items: readonly T[]): T {
  const index = Math.floor(Math.random() * items.length);
  const item = items[index];
  if (!item) {
    throw new Error("Empty array");
  }
  return item;
}

function generateFakeContext() {
  const userId = `user_${Math.floor(Math.random() * 10_000)}`;
  const userPlan = getRandomItem(PLANS);
  const country = getRandomItem(COUNTRIES);
  const device = getRandomItem(DEVICES);
  const userOs = getRandomItem(OS);

  return {
    user: {
      id: userId,
      email: `user${Math.floor(Math.random() * 10_000)}@example.com`,
      plan: userPlan,
      createdAt: new Date(
        Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
    },
    device: {
      type: device,
      os: userOs,
    },
    location: {
      country,
    },
    company: {
      id: `company_${Math.floor(Math.random() * 1000)}`,
      name: `Company ${Math.floor(Math.random() * 100)}`,
    },
  };
}

function generateRandomIp(): string {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function generateEvaluationsForFlag(
  flag: {
    id: string;
    environments: Array<{
      enabled: boolean;
      environment: { id: string } | null;
    }>;
    variations: Array<{
      id: string;
      value: unknown;
      isDefault: boolean;
    }>;
  },
  evaluationsPerFlag: number
): (typeof featureFlagEvaluation.$inferInsert)[] {
  if (flag.environments.length === 0 || flag.variations.length === 0) {
    return [];
  }

  const evaluations: (typeof featureFlagEvaluation.$inferInsert)[] = [];
  const defaultVariation = flag.variations.find((v) => v.isDefault);
  const firstVariation = flag.variations[0];

  for (let i = 0; i < evaluationsPerFlag; i++) {
    const envConfigIndex = Math.floor(Math.random() * flag.environments.length);
    const envConfig = flag.environments[envConfigIndex];
    if (!envConfig) {
      continue;
    }
    const env = envConfig.environment;
    if (!env) {
      continue;
    }

    const isEnabled = envConfig.enabled && Math.random() > 0.3;
    const variationIndex = Math.floor(Math.random() * flag.variations.length);
    const randomVariation = flag.variations[variationIndex];
    const variation = isEnabled
      ? (randomVariation ?? firstVariation)
      : (defaultVariation ?? firstVariation);
    if (!variation) {
      continue;
    }

    const context = generateFakeContext();
    const ipAddress = generateRandomIp();
    const createdAt = new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
    );
    const userAgent = getRandomItem(USER_AGENTS);

    evaluations.push({
      featureFlagId: flag.id,
      environmentId: env.id,
      variationId: variation.id,
      context: context as Record<string, unknown>,
      ipAddress,
      userAgent,
      value: variation.value,
      reason: isEnabled ? "matched_variation" : "default_variation",
      sdkKey: `sdk_key_${Math.floor(Math.random() * 1000)}`,
      sdkVersion: `1.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
      createdAt,
    });
  }

  return evaluations;
}

export const insertFakeEvaluations = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: InsertFakeEvaluationsInput;
}) => {
  const { flagIds, evaluationsPerFlag } = input;

  const flags = await ctx.db.query.featureFlag.findMany({
    where: ({ id, organizationId }, { eq, and, inArray: inArrayFn }) =>
      and(inArrayFn(id, flagIds), eq(organizationId, ctx.organization.id)),
    with: {
      environments: {
        with: {
          environment: true,
        },
      },
      variations: true,
    },
  });

  if (flags.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No flags found with the provided IDs",
    });
  }

  const evaluations: (typeof featureFlagEvaluation.$inferInsert)[] = [];

  for (const flag of flags) {
    const flagEvaluations = generateEvaluationsForFlag(
      flag,
      evaluationsPerFlag
    );
    evaluations.push(...flagEvaluations);
  }

  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < evaluations.length; i += batchSize) {
    const batch = evaluations.slice(i, i + batchSize);
    await ctx.db.insert(featureFlagEvaluation).values(batch);
    inserted += batch.length;
  }

  return {
    inserted,
    flagsProcessed: flags.length,
  };
};
