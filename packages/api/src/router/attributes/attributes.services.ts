import { attribute } from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import type {
  CreateAttributeInput,
  ListAttributesInput,
} from "./attributes.schemas";

export const DEFAULT_ATTRIBUTES = [
  {
    key: "userId",
    displayName: "User ID",
    type: "string",
    description: "Unique identifier for the user",
  },
  {
    key: "email",
    displayName: "Email",
    type: "string",
    description: "User's email address",
  },
  {
    key: "country",
    displayName: "Country",
    type: "string",
    description: "User's country code",
  },
  {
    key: "device",
    displayName: "Device",
    type: "string",
    description: "User's device type",
  },
  {
    key: "platform",
    displayName: "Platform",
    type: "string",
    description: "Operating system or platform",
  },
  {
    key: "appVersion",
    displayName: "App Version",
    type: "string",
    description: "Application version",
  },
];

export const seedDefaultAttributes = async ({
  ctx,
  projectId,
  organizationId,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  projectId: string;
  organizationId: string;
}) => {
  const attributeValues = DEFAULT_ATTRIBUTES.map((attr) => ({
    key: attr.key,
    displayName: attr.displayName,
    description: attr.description,
    type: attr.type,
    isManual: false,
    projectId,
    organizationId,
  }));

  await ctx.db.insert(attribute).values(attributeValues);
};

export const listAttributes = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: ListAttributesInput;
}) => {
  const { projectSlug } = input;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(slug, projectSlug),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  const attributes = await ctx.db.query.attribute.findMany({
    where: (table, { eq, and }) =>
      and(
        eq(table.projectId, foundProject.id),
        eq(table.organizationId, ctx.organization.id)
      ),
    orderBy: (table, { desc, asc }) => [desc(table.usageCount), asc(table.key)],
  });

  return attributes;
};

export const createAttribute = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: CreateAttributeInput;
}) => {
  const { projectSlug, ...attributeData } = input;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(slug, projectSlug),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  const existingAttribute = await ctx.db.query.attribute.findFirst({
    where: (table, { eq, and }) =>
      and(
        eq(table.key, attributeData.key),
        eq(table.projectId, foundProject.id),
        eq(table.organizationId, ctx.organization.id)
      ),
  });

  if (existingAttribute) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `Attribute with key "${attributeData.key}" already exists`,
    });
  }

  const [createdAttribute] = await ctx.db
    .insert(attribute)
    .values({
      ...attributeData,
      projectId: foundProject.id,
      organizationId: ctx.organization.id,
      createdById: ctx.session.user.id,
      isManual: true,
    })
    .returning();

  return createdAttribute;
};
