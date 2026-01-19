import { and, count, eq } from "@gradual/db";
import { featureFlag, organization, project } from "@gradual/db/schema";
import { desc } from "drizzle-orm";
import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import type { GetFeatureFlagsByProjectAndOrganizationInput } from "./feature-flags.schemas";

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
