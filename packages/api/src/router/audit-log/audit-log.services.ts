import { and, desc, eq, gte, lt, sql } from "@gradual/db";
import { auditLog, project, user } from "@gradual/db/schema";
import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import type {
  ExportAuditLogsInput,
  ListAuditLogsInput,
} from "./audit-log.schemas";

export const listAuditLogs = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: ListAuditLogsInput;
}) => {
  const { limit, cursor } = input;

  const conditions = [eq(auditLog.organizationId, ctx.organization.id)];

  if (input.action) {
    conditions.push(eq(auditLog.action, input.action));
  }
  if (input.resourceType) {
    conditions.push(eq(auditLog.resourceType, input.resourceType));
  }
  if (input.userId) {
    conditions.push(eq(auditLog.userId, input.userId));
  }
  if (input.startDate) {
    conditions.push(gte(auditLog.createdAt, input.startDate));
  }
  if (input.endDate) {
    conditions.push(lt(auditLog.createdAt, input.endDate));
  }
  if (input.search) {
    const pattern = `%${input.search}%`;
    conditions.push(
      sql`(${auditLog.metadata}->>'name' ILIKE ${pattern} OR ${auditLog.metadata}->>'key' ILIKE ${pattern})`
    );
  }
  if (cursor) {
    conditions.push(lt(auditLog.createdAt, new Date(cursor)));
  }

  if (input.projectSlug) {
    const slug = input.projectSlug;
    const foundProject = await ctx.db.query.project.findFirst({
      where: (p, { eq: e, and: a }) =>
        a(e(p.slug, slug), e(p.organizationId, ctx.organization.id)),
      columns: { id: true },
    });
    if (foundProject) {
      conditions.push(eq(auditLog.projectId, foundProject.id));
    }
  }

  const rows = await ctx.db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      projectId: auditLog.projectId,
      metadata: auditLog.metadata,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      createdAt: auditLog.createdAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      projectName: project.name,
    })
    .from(auditLog)
    .innerJoin(user, eq(auditLog.userId, user.id))
    .leftJoin(project, eq(auditLog.projectId, project.id))
    .where(and(...conditions))
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? items.at(-1)?.createdAt?.toISOString()
    : undefined;

  return { items, nextCursor };
};

const EXPORT_LIMIT = 10_000;

export const exportAuditLogs = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: ExportAuditLogsInput;
}) => {
  const conditions = [eq(auditLog.organizationId, ctx.organization.id)];

  if (input.action) {
    conditions.push(eq(auditLog.action, input.action));
  }
  if (input.resourceType) {
    conditions.push(eq(auditLog.resourceType, input.resourceType));
  }
  if (input.userId) {
    conditions.push(eq(auditLog.userId, input.userId));
  }
  if (input.startDate) {
    conditions.push(gte(auditLog.createdAt, input.startDate));
  }
  if (input.endDate) {
    conditions.push(lt(auditLog.createdAt, input.endDate));
  }
  if (input.search) {
    const pattern = `%${input.search}%`;
    conditions.push(
      sql`(${auditLog.metadata}->>'name' ILIKE ${pattern} OR ${auditLog.metadata}->>'key' ILIKE ${pattern})`
    );
  }

  if (input.projectSlug) {
    const slug = input.projectSlug;
    const foundProject = await ctx.db.query.project.findFirst({
      where: (p, { eq: e, and: a }) =>
        a(e(p.slug, slug), e(p.organizationId, ctx.organization.id)),
      columns: { id: true },
    });
    if (foundProject) {
      conditions.push(eq(auditLog.projectId, foundProject.id));
    }
  }

  const rows = await ctx.db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      projectId: auditLog.projectId,
      metadata: auditLog.metadata,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      createdAt: auditLog.createdAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      projectName: project.name,
    })
    .from(auditLog)
    .innerJoin(user, eq(auditLog.userId, user.id))
    .leftJoin(project, eq(auditLog.projectId, project.id))
    .where(and(...conditions))
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(EXPORT_LIMIT);

  return { items: rows };
};
