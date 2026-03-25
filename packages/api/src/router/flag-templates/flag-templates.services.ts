import { desc, eq, or, sql } from "@gradual/db";
import { flagTemplate } from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import type {
  CreateFlagTemplateInput,
  DeleteFlagTemplateInput,
  GetFlagTemplateInput,
  IncrementUsageInput,
  ListFlagTemplatesInput,
  UpdateFlagTemplateInput,
} from "./flag-templates.schemas";

export const listFlagTemplates = async ({
  ctx,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: ListFlagTemplatesInput;
}) => {
  const templates = await ctx.db
    .select()
    .from(flagTemplate)
    .where(
      or(
        eq(flagTemplate.organizationId, ctx.organization.id),
        eq(flagTemplate.isSystem, true)
      )
    )
    .orderBy(desc(flagTemplate.usageCount), desc(flagTemplate.createdAt));

  return templates;
};

export const getFlagTemplate = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetFlagTemplateInput;
}) => {
  const template = await ctx.db.query.flagTemplate.findFirst({
    where: (table, { eq: e, and: a, or: o }) =>
      a(
        e(table.id, input.templateId),
        o(e(table.organizationId, ctx.organization.id), e(table.isSystem, true))
      ),
  });

  if (!template) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Template not found",
    });
  }

  return template;
};

export const createFlagTemplate = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: CreateFlagTemplateInput;
}) => {
  const [template] = await ctx.db
    .insert(flagTemplate)
    .values({
      name: input.name,
      description: input.description,
      config: input.config,
      organizationId: ctx.organization.id,
      createdById: ctx.session.user.id,
    })
    .returning();

  return template;
};

export const updateFlagTemplate = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: UpdateFlagTemplateInput;
}) => {
  const existing = await ctx.db.query.flagTemplate.findFirst({
    where: (table, { eq: e, and: a }) =>
      a(
        e(table.id, input.templateId),
        e(table.organizationId, ctx.organization.id)
      ),
  });

  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Template not found",
    });
  }

  if (existing.isSystem) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot modify system templates",
    });
  }

  const [updated] = await ctx.db
    .update(flagTemplate)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.config !== undefined && { config: input.config }),
    })
    .where(eq(flagTemplate.id, input.templateId))
    .returning();

  return updated;
};

export const deleteFlagTemplate = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: DeleteFlagTemplateInput;
}) => {
  const existing = await ctx.db.query.flagTemplate.findFirst({
    where: (table, { eq: e, and: a }) =>
      a(
        e(table.id, input.templateId),
        e(table.organizationId, ctx.organization.id)
      ),
  });

  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Template not found",
    });
  }

  if (existing.isSystem) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot delete system templates",
    });
  }

  await ctx.db
    .delete(flagTemplate)
    .where(eq(flagTemplate.id, input.templateId));
};

export const incrementUsage = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: IncrementUsageInput;
}) => {
  await ctx.db
    .update(flagTemplate)
    .set({
      usageCount: sql`${flagTemplate.usageCount} + 1`,
    })
    .where(eq(flagTemplate.id, input.templateId));
};
