import { and, eq, isNull } from "@gradual/db";
import { environment } from "@gradual/db/schema";
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
  return await ctx.db.insert(environment).values(input);
};

export const listEnvironments = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: ListEnvironmentsInput;
}) => {
  const environments = await ctx.db.query.environment.findMany({
    where: ({ organizationId, deletedAt }, { eq, isNull, and }) =>
      and(eq(organizationId, input.organizationId), isNull(deletedAt)),
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
  return await ctx.db
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
    );
};

export const deleteEnvironment = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: DeleteEnvironmentInput;
}) => {
  return await ctx.db
    .update(environment)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(environment.id, input.id),
        eq(environment.organizationId, input.organizationId),
        isNull(environment.deletedAt)
      )
    );
};
