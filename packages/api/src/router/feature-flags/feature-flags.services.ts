import { and, count, eq } from "@gradual/db";
import {
  environment,
  featureFlag,
  featureFlagEnvironment,
  featureFlagVariation,
  organization,
  project,
} from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import { desc } from "drizzle-orm";
import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import type {
  CreateCompleteFeatureFlagInput,
  GetFeatureFlagByKeyInput,
  GetFeatureFlagsByProjectAndOrganizationInput,
} from "./feature-flags.schemas";

export const getAllFeatureFlagsByProjectAndOrganization = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetFeatureFlagsByProjectAndOrganizationInput;
}) => {
  const { projectSlug, organizationSlug, page, limit } = input;
  const offset = (page - 1) * limit;

  const countResult = await ctx.db
    .select({ count: count() })
    .from(featureFlag)
    .innerJoin(project, eq(featureFlag.projectId, project.id))
    .innerJoin(organization, eq(featureFlag.organizationId, organization.id))
    .where(
      and(
        eq(organization.slug, organizationSlug),
        eq(project.slug, projectSlug)
      )
    );

  const totalCount = countResult[0]?.count ?? 0;

  const flags = await ctx.db
    .select({
      id: featureFlag.id,
      key: featureFlag.key,
      name: featureFlag.name,
      description: featureFlag.description,
      type: featureFlag.type,
      status: featureFlag.status,
      projectId: featureFlag.projectId,
      organizationId: featureFlag.organizationId,
      tags: featureFlag.tags,
      maintainerId: featureFlag.maintainerId,
      archivedAt: featureFlag.archivedAt,
      createdAt: featureFlag.createdAt,
      updatedAt: featureFlag.updatedAt,
    })
    .from(featureFlag)
    .innerJoin(project, eq(featureFlag.projectId, project.id))
    .innerJoin(organization, eq(featureFlag.organizationId, organization.id))
    .where(
      and(
        eq(organization.slug, organizationSlug),
        eq(project.slug, projectSlug)
      )
    )
    .orderBy(desc(featureFlag.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    data: flags,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
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
    defaultVariations,
    environmentConfigs,
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
        variations.map(
          (variation: (typeof variations)[number], index: number) => ({
            featureFlagId: createdFlag.id,
            name: variation.name,
            value: variation.value,
            description: variation.description,
            isDefault: variation.isDefault,
            isDefaultWhenOn: index === defaultVariations.whenOn,
            isDefaultWhenOff: index === defaultVariations.whenOff,
            rolloutPercentage: variation.rolloutPercentage,
            sortOrder: variation.sortOrder,
          })
        )
      )
      .returning()) as Array<{
      id: string;
      name: string;
      value: unknown;
      isDefault: boolean;
      isDefaultWhenOn: boolean;
      isDefaultWhenOff: boolean;
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

    if (environmentConfigs && environmentConfigs.length > 0) {
      const environmentIds = environmentConfigs.map(
        (config: (typeof environmentConfigs)[number]) => config.environmentId
      );
      const environments = await tx.query.environment.findMany({
        where: (
          { id, projectId, organizationId, deletedAt },
          { eq, inArray, isNull, and }
        ) =>
          and(
            inArray(id, environmentIds),
            eq(projectId, foundProject.id),
            eq(organizationId, ctx.organization.id),
            isNull(deletedAt)
          ),
      });

      if (environments.length !== environmentConfigs.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "One or more environment IDs are invalid or do not belong to this project",
        });
      }

      await tx.insert(featureFlagEnvironment).values(
        environmentConfigs.map(
          (config: (typeof environmentConfigs)[number]) => ({
            featureFlagId: createdFlag.id,
            environmentId: config.environmentId,
            enabled: config.enabled,
            defaultVariationId:
              config.defaultVariationId ?? defaultVariation.id,
          })
        )
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
