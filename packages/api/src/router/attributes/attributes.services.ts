import { attribute, context } from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import type {
  CreateAttributeInput,
  ListAttributesInput,
  ListContextsInput,
} from "./attributes.schemas";

export const DEFAULT_CONTEXTS = [
  {
    kind: "user" as const,
    name: "User",
    description: "User-related attributes for targeting individual users",
  },
  {
    kind: "device" as const,
    name: "Device",
    description:
      "Device and platform attributes for targeting specific devices",
  },
  {
    kind: "organization" as const,
    name: "Organization",
    description: "Organization-level attributes for B2B targeting",
  },
  {
    kind: "location" as const,
    name: "Location",
    description: "Geographic attributes for location-based targeting",
  },
];

export const DEFAULT_ATTRIBUTES_BY_CONTEXT: Record<
  string,
  Array<{
    key: string;
    displayName: string;
    type: string;
    description: string;
  }>
> = {
  user: [
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
      key: "name",
      displayName: "Name",
      type: "string",
      description: "User's display name",
    },
    {
      key: "role",
      displayName: "Role",
      type: "string",
      description: "User's role or permission level",
    },
    {
      key: "plan",
      displayName: "Plan",
      type: "string",
      description: "User's subscription plan",
    },
  ],
  device: [
    {
      key: "deviceId",
      displayName: "Device ID",
      type: "string",
      description: "Unique identifier for the device",
    },
    {
      key: "platform",
      displayName: "Platform",
      type: "string",
      description: "Operating system (iOS, Android, Web)",
    },
    {
      key: "os",
      displayName: "OS Version",
      type: "string",
      description: "Operating system version",
    },
    {
      key: "appVersion",
      displayName: "App Version",
      type: "string",
      description: "Application version",
    },
    {
      key: "browserName",
      displayName: "Browser",
      type: "string",
      description: "Browser name",
    },
  ],
  organization: [
    {
      key: "organizationId",
      displayName: "Organization ID",
      type: "string",
      description: "Unique identifier for the organization",
    },
    {
      key: "organizationName",
      displayName: "Organization Name",
      type: "string",
      description: "Name of the organization",
    },
    {
      key: "industry",
      displayName: "Industry",
      type: "string",
      description: "Industry or sector",
    },
    {
      key: "tier",
      displayName: "Tier",
      type: "string",
      description: "Organization tier or plan level",
    },
  ],
  location: [
    {
      key: "country",
      displayName: "Country",
      type: "string",
      description: "Country code (ISO 3166-1 alpha-2)",
    },
    {
      key: "region",
      displayName: "Region",
      type: "string",
      description: "State, province, or region",
    },
    {
      key: "city",
      displayName: "City",
      type: "string",
      description: "City name",
    },
    {
      key: "timezone",
      displayName: "Timezone",
      type: "string",
      description: "Timezone identifier (e.g., America/New_York)",
    },
  ],
};

export const seedDefaultAttributes = async ({
  ctx,
  projectId,
  organizationId,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  projectId: string;
  organizationId: string;
}) => {
  const contextValues = DEFAULT_CONTEXTS.map((ctx) => ({
    kind: ctx.kind,
    name: ctx.name,
    description: ctx.description,
    projectId,
    organizationId,
  }));

  const createdContexts = await ctx.db
    .insert(context)
    .values(contextValues)
    .returning();

  const contextIdByKind = new Map(createdContexts.map((c) => [c.kind, c.id]));

  const attributeValues: Array<{
    key: string;
    displayName: string;
    description: string;
    type: string;
    isManual: boolean;
    projectId: string;
    organizationId: string;
    contextId: string | null;
  }> = [];

  for (const [contextKind, attributes] of Object.entries(
    DEFAULT_ATTRIBUTES_BY_CONTEXT
  )) {
    const contextId =
      contextIdByKind.get(
        contextKind as "user" | "device" | "organization" | "location"
      ) ?? null;
    for (const attr of attributes) {
      attributeValues.push({
        key: attr.key,
        displayName: attr.displayName,
        description: attr.description,
        type: attr.type,
        isManual: false,
        projectId,
        organizationId,
        contextId,
      });
    }
  }

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
    with: {
      context: true,
    },
    orderBy: (table, { desc, asc }) => [desc(table.usageCount), asc(table.key)],
  });

  return attributes;
};

export const listContexts = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: ListContextsInput;
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

  const contexts = await ctx.db.query.context.findMany({
    where: (table, { eq, and }) =>
      and(
        eq(table.projectId, foundProject.id),
        eq(table.organizationId, ctx.organization.id)
      ),
    with: {
      attributes: true,
    },
    orderBy: (table, { asc }) => [asc(table.kind)],
  });

  return contexts;
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
