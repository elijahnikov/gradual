import { and, eq, isNull } from "@gradual/db";
import {
  environment,
  featureFlag,
  featureFlagEnvironment,
} from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import type {
  CreateEnvironmentInput,
  DeleteEnvironmentInput,
  GetEnvironmentBySlugInput,
  GetEnvironmentInput,
  ListEnvironmentsInput,
  UpdateEnvironmentInput,
} from "./environment.schemas";

export const createEnvironment = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: CreateEnvironmentInput;
}) => {
  const { organization } = ctx;
  const { projectSlug } = input;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(slug, projectSlug),
        eq(organizationId, organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  const [createdEnvironment] = await ctx.db
    .insert(environment)
    .values({
      ...input,
      organizationId: organization.id,
      projectId: foundProject.id,
    })
    .returning();

  const existingFlags = await ctx.db.query.featureFlag.findMany({
    where: and(
      eq(featureFlag.projectId, foundProject.id),
      isNull(featureFlag.archivedAt)
    ),
    with: {
      environments: {
        limit: 1,
      },
      variations: {
        where: (v, { eq }) => eq(v.isDefault, true),
        limit: 1,
      },
    },
  });

  if (existingFlags.length > 0 && createdEnvironment) {
    await ctx.db.insert(featureFlagEnvironment).values(
      existingFlags.map((flag) => {
        const existingEnvConfig = flag.environments[0];
        const defaultVariation = flag.variations[0];

        return {
          featureFlagId: flag.id,
          environmentId: createdEnvironment.id,
          enabled: false,
          defaultVariationId:
            existingEnvConfig?.defaultVariationId ?? defaultVariation?.id,
          offVariationId:
            existingEnvConfig?.offVariationId ?? defaultVariation?.id,
        };
      })
    );
  }

  return createdEnvironment;
};

export const listEnvironments = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: ListEnvironmentsInput;
}) => {
  const environments = await ctx.db.query.environment.findMany({
    where: ({ organizationId, projectId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(organizationId, input.organizationId),
        eq(projectId, input.projectId),
        isNull(deletedAt)
      ),
    orderBy: (env, { asc }) => asc(env.createdAt),
  });
  return environments;
};

export const getEnvironment = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetEnvironmentInput;
}) => {
  const environment = await ctx.db.query.environment.findFirst({
    where: ({ id, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(id, input.id),
        eq(organizationId, input.organizationId),
        isNull(deletedAt)
      ),
    with: {
      project: true,
      organization: true,
    },
  });

  if (!environment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Environment not found",
    });
  }

  return environment;
};

export const getEnvironmentBySlug = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetEnvironmentBySlugInput;
}) => {
  const environment = await ctx.db.query.environment.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(slug, input.slug),
        eq(organizationId, input.organizationId),
        isNull(deletedAt)
      ),
    with: {
      project: true,
      organization: true,
    },
  });

  if (!environment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Environment not found",
    });
  }

  return environment;
};

export const updateEnvironment = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: UpdateEnvironmentInput;
}) => {
  const { organizationId, id, ...rest } = input;
  const [updatedEnvironment] = await ctx.db
    .update(environment)
    .set({
      ...rest,
    })
    .where(
      and(
        eq(environment.id, id),
        eq(environment.organizationId, organizationId),
        isNull(environment.deletedAt)
      )
    )
    .returning();

  if (!updatedEnvironment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Environment not found",
    });
  }

  return updatedEnvironment;
};

export const deleteEnvironment = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: DeleteEnvironmentInput;
}) => {
  const foundEnvironment = await ctx.db.query.environment.findFirst({
    where: ({ id, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(id, input.id),
        eq(organizationId, input.organizationId),
        isNull(deletedAt)
      ),
  });

  if (!foundEnvironment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Environment not found",
    });
  }

  const [deletedEnvironment] = await ctx.db
    .update(environment)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(environment.id, input.id),
        eq(environment.organizationId, input.organizationId),
        isNull(environment.deletedAt)
      )
    )
    .returning();

  return deletedEnvironment;
};
